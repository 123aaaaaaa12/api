const ALLOWED_ORIGINS = [
  "https://netivly.pl",
  "https://www.netivly.pl"
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, request, options = {}) {
  return Response.json(data, {
    ...options,
    headers: {
      ...getCorsHeaders(request),
      ...(options.headers || {})
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/threads"
    ) {
      const result = await env.DB
        .prepare(`
          SELECT id, title, created_at
          FROM threads
          ORDER BY id DESC
        `)
        .all();

      return json(result.results, request);
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/thread/")
    ) {
      const id = url.pathname.split("/").pop();

      const thread = await env.DB
        .prepare(`
          SELECT id, title, created_at
          FROM threads
          WHERE id = ?
        `)
        .bind(id)
        .first();

      if (!thread) {
        return json(
          { error: "Wątek nie istnieje" },
          request,
          { status: 404 }
        );
      }

      const posts = await env.DB
        .prepare(`
          SELECT id, thread_id, content, created_at
          FROM posts
          WHERE thread_id = ?
          ORDER BY id ASC
        `)
        .bind(id)
        .all();

      return json({
        thread,
        posts: posts.results
      }, request);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/thread"
    ) {
      try {
        const body = await request.json();

        if (
          !body.title ||
          body.title.trim().length === 0
        ) {
          return json(
            { error: "Tytuł jest wymagany" },
            request,
            { status: 400 }
          );
        }

        const result = await env.DB
          .prepare(`
            INSERT INTO threads (title)
            VALUES (?)
          `)
          .bind(body.title.trim())
          .run();

        return json({
          success: true,
          thread_id: result.meta.last_row_id
        }, request);
      } catch (error) {
        return json(
          { error: "Nieprawidłowe dane" },
          request,
          { status: 400 }
        );
      }
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/post"
    ) {
      try {
        const body = await request.json();

        if (
          !body.thread_id ||
          !body.content ||
          body.content.trim().length === 0
        ) {
          return json(
            { error: "Treść posta jest wymagana" },
            request,
            { status: 400 }
          );
        }

        const thread = await env.DB
          .prepare(`
            SELECT id
            FROM threads
            WHERE id = ?
          `)
          .bind(body.thread_id)
          .first();

        if (!thread) {
          return json(
            { error: "Wątek nie istnieje" },
            request,
            { status: 404 }
          );
        }

        const result = await env.DB
          .prepare(`
            INSERT INTO posts (thread_id, content)
            VALUES (?, ?)
          `)
          .bind(
            body.thread_id,
            body.content.trim()
          )
          .run();

        return json({
          success: true,
          post_id: result.meta.last_row_id
        }, request);
      } catch (error) {
        return json(
          { error: "Nieprawidłowe dane" },
          request,
          { status: 400 }
        );
      }
    }

    return json({
      name: "Netivly API",
      status: "online"
    }, request);
  }
};
