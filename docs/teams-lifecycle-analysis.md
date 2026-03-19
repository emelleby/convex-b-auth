# Better-Auth Organization & Teams Lifecycle

## Current Behavior & Findings

Based on an analysis of the Better Auth source code (specifically the `organization` plugin routes and adapter), here is exactly what happens under the hood when teams are enabled:

### 1. Organization Creation
When you call `authClient.organization.create()` and the `teams: { enabled: true }` option is set in your server configuration, Better Auth does the following automatically:
- Creates the `organization` database record.
- Creates the `member` database record (assigning the creator as 'owner' or 'admin').
- **Automatically creates a default `team`** (with the same name as the organization), unless `defaultTeam.enabled: false` is explicitly configured.
- Creates a `teamMember` record, affiliating the creator with this newly created default team.

*This explains why you observe a Team being created in the Convex DB every time an organization is created.*

### 2. Organization Deletion
When you call `authClient.organization.delete()`, Better Auth's default adapter logic deletes the following:
1. All `member` records associated with the `organizationId`.
2. All `invitation` records associated with the `organizationId`.
3. The `organization` record itself.

**The Issue (Orphaned Data):**
Better Auth's current adapter implementation **does not automatically delete the associated `team` or `teamMember` records** when an organization is deleted. Furthermore, Convex natively does not support automatic SQL-style cascading deletes. This results in orphaned `team` and `teamMember` documents lingering in your database after their parent organization has been removed.

---

## What We Should Have Instead

To maintain a clean database and match your expected logic, we need to ensure that **deleting an organization automatically cascades the deletion to all its teams and team members**. 

Additionally, your thinking is correct regarding manual Team deletion: if an admin manually deletes a specific team, only the `team` and its associated `teamMember` records should be deleted; the users remain members of the overarching organization.

### Diagram: Desired Organization & Team Lifecycle

```mermaid
graph TD
    subgraph Creation Flow
        A[User creates Organization] --> B(Better Auth creates Org)
        B --> C{teams.enabled?}
        C -- Yes --> D(Auto-create Default Team)
        D --> E(Add User to Default Team)
        C -- No --> F(End)
    end

    subgraph Deletion Flow (To Implement)
        G[User deletes Organization] --> H(Trigger beforeDeleteOrganization hook)
        H --> I(Find all Teams for Org)
        I --> J(Delete all TeamMembers for those Teams)
        J --> K(Delete all Teams for Org)
        K --> L(Better Auth deletes Members & Invitations)
        L --> M(Better Auth deletes Org)
    end
```

---

## Recommendations & Implementation Steps

To achieve this, we should utilize Better Auth's **Organization Hooks** (`beforeDeleteOrganization` or `afterDeleteOrganization`). We can configure this directly inside `convex/betterAuth/auth.ts`.

### Recommendation 1: Cascade Deletion via Better Auth Hooks
We should add an `organizationHooks` configuration that fetches and deletes all orphaned teams and team members just before Better Auth deletes the organization itself.

### Recommendation 2: Consider Disabling the Default Team (Optional)
If your app logic prefers that an organization starts with **zero** teams by default (and admins must explicitly create them), we can disable the automatic default team creation in your configuration:

```typescript
// convex/betterAuth/auth.ts
organization({
  teams: {
    enabled: true,
    // Add this if you DON'T want teams to be automatically created
    // defaultTeam: { enabled: false },
    maximumTeams: 10,
  },
  // ...
})
```
However, if you *prefer* having a default team that every member is added to, you can leave it enabled, but we still **must** implement the cleanup hook.

### Next Steps 
If you agree with this analysis, I will add the `organizationHooks` into `convex/betterAuth/auth.ts` using Convex queries/mutations to gracefully delete the teams and team members when an organization is deleted. Let me know if you would like me to proceed with implementing this fix!
