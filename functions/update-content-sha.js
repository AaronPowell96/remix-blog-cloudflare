export async function onRequest(context) {
  // Contents of context object
  const {
    request, // same as existing Worker API
    env, // same as existing Worker API
    params, // if filename includes [id] or [[path]]
    waitUntil, // same as ctx.waitUntil in existing Worker API
    next, // used for middleware or to fetch assets
    data, // arbitrary space for passing data between middlewares
  } = context;

  try {
    // const key = request.headers.get("Authorization");
    // if (key !== `Bearer ${POST_API_KEY}`) {
    //   return new Response(`Unauthorized ${key}`, { status: 401 });
    // }
    return new Response(JSON.stringify(request, null, 2));
    const data = await request.json();

    await CONTENT.put("$$content-sha", JSON.stringify(data));
    return new Response(json.stringify({ success: true }));
  } catch (e) {
    //@ts-expect-error
    return new Response(
      JSON.stringify({ message: e.message, stack: e.stack }, null, 2)
    );
  }

  const resp = (await env.CONTENT.get("$$content-sha", "json")) || {
    commit: { sha: "" },
  };
  return new Response(JSON.stringify(resp, null, 2));
}
