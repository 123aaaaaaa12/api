export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Lista wszystkich wątków
    if (request.method === "GET" && url.pathname === "/api/threads") {
      const result = await env.DB
        .prepare(`
          SELECT id, title, created_at
          FROM threads
          ORDER BY id DESC
        `)
        .all();

      return Response.json(result.results);
    }

    // Jeden wątek + jego posty
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
        return Response.json(
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

      return Response.json({
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

        if (!body.title || body.title.trim().length === 0) {
          return Response.json(
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

        return Response.json({
          success: true,
          thread_id: result.meta.last_row_id
        });
      } catch (error) {
        return Response.json(
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
          return Response.json(
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
          return Response.json(
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

        return Response.json({
          success: true,
          post_id: result.meta.last_row_id
        });
      } catch (error) {
        return Response.json(
          { error: "Nieprawidłowe dane" },
          { status: 400 }
        );
      }
    }

    return Response.json({
      name: "Netivly API",
      status: "online"
    });
  }
};
