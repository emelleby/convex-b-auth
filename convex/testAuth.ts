import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const getMyId = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    return user ? Object.keys(user) : null;
  }
});
