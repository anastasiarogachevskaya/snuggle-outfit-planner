import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Blog — Layerly";
const DESCRIPTION =
  "Product news from Layerly: how we help parents dress their baby for today's weather, one milestone at a time.";

export const Route = createFileRoute("/blog/")({
  head: () => {
    const meta = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/blog" });
    return {
      ...meta,
      scripts: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]),
      ],
    };
  },
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10 font-sans">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-ink">
            Layerly
          </Link>
          <nav aria-label="Top" className="flex items-center gap-4 text-sm">
            <Link to="/how-it-works" className="font-medium text-ink/70">
              How it works
            </Link>
            <Link to="/try" className="font-medium text-primary">
              Try Layerly
            </Link>
          </nav>
        </header>

        <main>
          <h1 className="mb-4 font-serif text-3xl font-semibold leading-tight text-ink">Blog</h1>
          <p className="mb-10 leading-relaxed text-ink/70">
            What's new in Layerly, and why we built it that way.
          </p>

          <ul className="space-y-8">
            {BLOG_POSTS.map((post) => (
              <li key={post.slug}>
                <article>
                  <p className="text-xs uppercase tracking-widest text-ink/40">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-semibold leading-snug text-ink">
                    <Link to="/blog/$slug" params={{ slug: post.slug }}>
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{post.summary}</p>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="mt-2 inline-block text-sm font-medium text-primary"
                  >
                    Read {post.title}
                  </Link>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <Link
              to="/try"
              className="block w-full rounded-2xl bg-primary py-4 text-center font-medium text-primary-foreground shadow-md shadow-primary/20"
            >
              Try Layerly — no account needed
            </Link>
          </div>
        </main>

        <SiteFooter className="mt-16" />
      </div>
    </div>
  );
}
