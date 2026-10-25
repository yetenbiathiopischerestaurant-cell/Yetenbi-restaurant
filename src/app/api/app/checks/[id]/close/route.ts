import { appRoute, idOf } from "@/lib/server/app-auth";
import { closeCheck } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST { key? }: "Tisch schließen" — frees the table; no payment is recorded (payment is taken outside the app). */
export const POST = appRoute<Ctx>(async (_request, user, { params }) => closeCheck(user, idOf((await params).id)));
