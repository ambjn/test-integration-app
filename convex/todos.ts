import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getTodos = query({
    handler: async (ctx) => {
        return await ctx.db.query("todos").order('desc').collect();
    }
})

export const addTodo = mutation({
    args: {
        text: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Not authenticated");
        }
        console.log('identity')
        console.log(identity)
        return await ctx.db.insert("todos", {
            text: args.text,
            completed: false,
        });
    }
})