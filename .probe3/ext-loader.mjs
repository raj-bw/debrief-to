// Lets plain Node import the app's extensionless paths and JSON files.
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) { if (/^\.{1,2}\//.test(spec) && !/\.\w+$/.test(spec)) return next(spec + ".js", ctx); throw e; }
}
export async function load(url, ctx, next) {
  if (url.endsWith(".json")) return next(url, { ...ctx, importAttributes: { ...(ctx.importAttributes || {}), type: "json" } });
  return next(url, ctx);
}
