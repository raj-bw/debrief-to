export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (err) {
    if (/^\.{1,2}\//.test(spec) && !/\.\w+$/.test(spec)) return next(`${spec}.js`, ctx);
    throw err;
  }
}
export async function load(url, ctx, next) {
  if (url.endsWith(".json")) return next(url, { ...ctx, importAttributes: { ...(ctx.importAttributes || {}), type: "json" } });
  return next(url, ctx);
}
