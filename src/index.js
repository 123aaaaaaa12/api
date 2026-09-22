```js
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://netivly.pl",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, options = {}) {
  return Response.json(data, {
    ...options,
    headers: {
      ...corsHeaders,
      ...(options.headers || {})
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Lista wszystkich wątków
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

      return json(result.results);
    }

    // Jeden wątek + posty
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
      });
    }

    // Tworzenie nowego wątku
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
        });
      } catch (error) {
        return json(
          { error: "Nieprawidłowe dane" },
          { status: 400 }
        );
      }
    }

    // Dodawanie posta
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
        });
      } catch (error) {
        return json(
          { error: "Nieprawidłowe dane" },
          { status: 400 }
        );
      }
    }

    return json({
      name: "Netivly API",
      status: "online"
    });
  }
};
```
