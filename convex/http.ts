import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
    path: "/ass",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const token = ctx.auth.getUserIdentity();
        console.log(token)
        return new Response(`Hello from ${request.url}`);
    }),
});
export default http;