import { ActionFunction, json } from "remix";
// declare var CONTENT: KVNamespace;
declare var POST_API_KEY: string;

export const action: ActionFunction = async ({ request, context }) => {
  const {CONTENT} = context.env
  try {
    // const key = request.headers.get("Authorization");
    // if (key !== `Bearer ${POST_API_KEY}`) {
    //   return new Response(`Unauthorized ${key}`, { status: 401 });
    // }

    const data = await request.json();
    console.log("DATA IN POST", data)
    await CONTENT.put(data.slug, JSON.stringify(data));
    console.log("CONTENT IN POST AFTER PUT", await CONTENT.get(data.slug))
    return json({ success: true });
  } catch (e) {
    //@ts-expect-error
    return json({ message: e.message, stack: e.stack });
  }
};
