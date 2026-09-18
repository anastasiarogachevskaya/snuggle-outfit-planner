import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog";
import { SiteFooter } from "@/components/site-footer";
import { BlogCardIllustration } from "@/components/blog-card-illustration";

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
      <div className="mx-auto w-full max-w-7xl px-6 py-10 font-sans sm:px-8 lg:px-12 lg:py-14">
        <header className="mb-12 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
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
          <div className="mb-10 max-w-xl sm:mb-14">
          <h1 className="mb-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">Layerly journal</h1>
          <p className="leading-relaxed text-ink/70">
            What's new in Layerly, and why we built it that way.
          </p>
          </div>

          <ul className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14">
            {BLOG_POSTS.map((post, index) => (
              <li key={post.slug} className="min-w-0">
                <article className="group h-full">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="flex h-full flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
                  >
                    <div className="transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1">
                      <BlogCardIllustration slug={post.slug} index={index} />
                    </div>
                    <div className="flex flex-1 flex-col pt-5">
                  <p className="text-xs uppercase tracking-widest text-ink/40">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug text-ink transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{post.summary}</p>
                  <span className="mt-4 text-sm font-medium text-primary">Read story →</span>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-16 max-w-md">
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
