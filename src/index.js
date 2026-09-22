export default {
  async fetch(request, env) {
    try {
      const result = await env.DB
        .prepare("SELECT 1 AS test")
        .first();

      return Response.json({
        status: "ok",
        database: result.test === 1
      });
    } catch (error) {
      return Response.json({
        status: "error",
        error: error.message
      }, { status: 500 });
    }
  }
};
