import { APP_FEEDBACK, APP_PAYMENTS } from "@/lib/features";
import { appRoute } from "@/lib/server/app-auth";
import { readMenu } from "@/lib/server/menu";
import { listTables, menuStamp, popularDishes } from "@/lib/server/service";

/*
  Everything the app needs on start and whenever the menu or tables change: who is signed in, the table plan, the
  menu (sold-out dishes included, marked, so the waiter sees them greyed out), the dishes ordered most, and which
  extras are switched on.
*/
export const GET = appRoute(async (_request, user) => {
  const [tables, menu, popular, stamp] = await Promise.all([listTables(), readMenu(), popularDishes(), menuStamp()]);
  return {
    user,
    tables,
    categories: menu
      .filter((category) => category.items.length > 0)
      .map((category) => ({
        id: category.id,
        title: category.title,
        drinks: category.drinks,
        items: category.items.map((dish) => ({
          id: dish.id,
          name: dish.name,
          amharic: dish.amharic,
          description: dish.description,
          price: dish.price,
          tags: dish.tags,
          allergens: dish.allergens,
          available: dish.available,
        })),
      })),
    popular,
    stamp,
    features: { feedback: APP_FEEDBACK, payments: APP_PAYMENTS },
    serverTime: new Date().toISOString(),
  };
});
