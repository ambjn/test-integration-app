// convex/notifications.ts
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

// ============= USER FUNCTIONS =============

// Save/Update user's push token
export const savePushToken = mutation({
    args: {
        pushToken: v.string(),
        deviceType: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const existingToken = await ctx.db
            .query("pushTokens")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (existingToken) {
            await ctx.db.patch(existingToken._id, {
                pushToken: args.pushToken,
                deviceType: args.deviceType,
                lastUpdated: Date.now(),
            });
            return existingToken._id;
        } else {
            return await ctx.db.insert("pushTokens", {
                userId,
                pushToken: args.pushToken,
                deviceType: args.deviceType,
                lastUpdated: Date.now(),
            });
        }
    },
});

// Get my notifications
export const getMyNotifications = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        return await ctx.db
            .query("notifications")
            .withIndex("by_recipient", (q) => q.eq("recipientId", identity.subject))
            .order("desc")
            .take(50);
    },
});

// Mark notification as read
export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const notification = await ctx.db.get(args.notificationId);

        if (!notification || notification.recipientId !== identity.subject) {
            throw new Error("Notification not found or unauthorized");
        }

        await ctx.db.patch(args.notificationId, {
            readAt: Date.now(),
        });
    },
});

// Get unread count
export const getUnreadCount = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return 0;

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_recipient", (q) => q.eq("recipientId", identity.subject))
            .collect();

        return notifications.filter(n => !n.readAt).length;
    },
});

// ============= CONVEX DASHBOARD/API FUNCTIONS =============
// These functions don't require authentication - call them from dashboard or API

// Get push token for a user
export const getPushToken = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const token = await ctx.db
            .query("pushTokens")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        return token?.pushToken || null;
    },
});

// Get all users with push tokens
export const getAllPushTokens = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("pushTokens").collect();
    },
});

// Send notification to single user
export const sendNotification = action({
    args: {
        recipientId: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args): Promise<any> => {
        // Get recipient's push token
        const tokenRecord = await ctx.runQuery(api.notifications.getPushToken, {
            userId: args.recipientId,
        });

        if (!tokenRecord) {
            throw new Error("Recipient has no push token registered");
        }

        // Send push notification via Expo API
        const message = {
            to: tokenRecord,
            sound: "default",
            title: args.title,
            body: args.body,
            data: args.data || {},
            priority: "high",
            channelId: "default",
        };

        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
            });

            const result = await response.json();

            // Log notification
            await ctx.runMutation(api.notifications.logNotification, {
                recipientId: args.recipientId,
                title: args.title,
                body: args.body,
                data: args.data,
                status: result.data?.status === "ok" ? "sent" : "failed",
            });

            return result;
        } catch (error) {
            // Log failed notification
            await ctx.runMutation(api.notifications.logNotification, {
                recipientId: args.recipientId,
                title: args.title,
                body: args.body,
                data: args.data,
                status: "failed",
            });

            throw error;
        }
    },
});

// Send notification to multiple users
export const sendBulkNotification = action({
    args: {
        recipientIds: v.array(v.string()),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args): Promise<Array<{ recipientId: string; success: boolean; result?: any; error?: string }>> => {
        const results: Array<{ recipientId: string; success: boolean; result?: any; error?: string }> = [];

        for (const recipientId of args.recipientIds) {
            try {
                const result = await ctx.runAction(api.notifications.sendNotification, {
                    recipientId,
                    title: args.title,
                    body: args.body,
                    data: args.data,
                });
                results.push({ recipientId, success: true, result });
            } catch (error) {
                results.push({ recipientId, success: false, error: String(error) });
            }
        }

        return results;
    },
});

// Send notification to ALL users
export const sendToAllUsers = action({
    args: {
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args): Promise<{ total: number; successful: number; failed: number; results: Array<{ recipientId: string; success: boolean; error?: string }> }> => {
        // Get all push tokens
        const allTokens = await ctx.runQuery(api.notifications.getAllPushTokens);

        const results: Array<{ recipientId: string; success: boolean; error?: string }> = [];

        for (const tokenRecord of allTokens) {
            try {
                const result = await ctx.runAction(api.notifications.sendNotification, {
                    recipientId: tokenRecord.userId,
                    title: args.title,
                    body: args.body,
                    data: args.data,
                });
                results.push({ recipientId: tokenRecord.userId, success: true });
            } catch (error) {
                results.push({ recipientId: tokenRecord.userId, success: false, error: String(error) });
            }
        }

        return {
            total: allTokens.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    },
});

// Log notification
export const logNotification = mutation({
    args: {
        recipientId: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            ...args,
            sentAt: Date.now(),
        });
    },
});