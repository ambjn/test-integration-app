import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    todos: defineTable({
        text: v.string(),
        completed: v.boolean(),
    }),
    pushTokens: defineTable({
        userId: v.string(), // Clerk user ID
        pushToken: v.string(),
        deviceType: v.string(), // 'ios' or 'android'
        lastUpdated: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_pushToken", ["pushToken"]),

    notifications: defineTable({
        recipientId: v.string(), // Clerk user ID
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
        status: v.string(), // 'sent', 'failed'
        sentAt: v.number(),
        readAt: v.optional(v.number()),
    })
        .index("by_recipient", ["recipientId"]),
})
