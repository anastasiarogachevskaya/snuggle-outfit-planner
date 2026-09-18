import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { OG_IMAGE, SITE_URL, breadcrumbLd, pageMeta } from "@/lib/seo";
import { formatPostDate, getPost } from "@/lib/blog";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Not found — Layerly" }, { name: "robots", content: "noindex" }],
      };
    }
    const { post } = loaderData;
    const path = `/blog/${post.slug}`;
    const meta = pageMeta({
      title: `${post.title} — Layerly`,
      description: post.summary,
      path,
      type: "article",
    });
    return {
      ...meta,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.summary,
            datePublished: post.date,
            image: OG_IMAGE,
            mainEntityOfPage: `${SITE_URL}${path}`,
            author: { "@type": "Organization", name: "Layerly" },
            publisher: { "@type": "Organization", name: "Layerly" },
          }),
        },
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]),
      ],
    };
  },
  notFoundComponent: PostNotFound,
  component: BlogPostPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 font-sans sm:px-8 lg:px-12 lg:py-14">
        <header className="mb-12 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-ink">
            Layerly
          </Link>
          <nav aria-label="Top" className="flex items-center gap-4 text-sm">
            <Link to="/blog" className="font-medium text-ink/70">
              Blog
            </Link>
            <Link to="/try" className="font-medium text-primary">
              Try Layerly
            </Link>
          </nav>
        </header>
        {children}
        <SiteFooter className="mt-16" />
      </div>
    </div>
  );
}

function PostNotFound() {
  return (
    <Shell>
      <main>
        <h1 className="mb-4 font-serif text-3xl font-semibold leading-tight text-ink">
          Post not found
        </h1>
        <p className="leading-relaxed text-ink/70">
          That article doesn't exist — it may have been renamed.
        </p>
        <Link to="/blog" className="mt-6 inline-block text-sm font-medium text-primary">
          Back to all posts
        </Link>
      </main>
    </Shell>
  );
}

function BlogPostPage() {
  const { post } = Route.useLoaderData();

  return (
    <Shell>
      <main className="mx-auto max-w-3xl">
        <article>
          <p className="text-xs uppercase tracking-widest text-ink/40">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-ink/70">{post.summary}</p>

          <div className="mt-10 space-y-10">
            {post.sections.map((section, i) => (
              <section key={section.heading ?? i}>
                {section.heading ? (
                  <h2 className="mb-3 text-lg font-medium text-ink">{section.heading}</h2>
                ) : null}
                {section.paragraphs ? (
                  <div className="space-y-4">
                    {section.paragraphs.map((p) => (
                      <p key={p.slice(0, 40)} className="leading-relaxed text-ink/70">
                        {p}
                      </p>
                    ))}
                  </div>
                ) : null}
                {section.image ? (
                  <figure className="mt-6">
                    <div className="overflow-hidden rounded-2xl border border-ink/5 bg-surface shadow-sm max-w-[280px] mx-auto sm:max-w-xs">
                      <img
                        src={section.image.src}
                        alt={section.image.alt}
                        loading="lazy"
                        className="w-full"
                      />
                    </div>
                    {section.image.caption ? (
                      <figcaption className="mt-2 text-center text-sm text-ink/50">
                        {section.image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <div className="mt-14 flex flex-col gap-4 sm:flex-row">
          <Link
            to="/try"
            className="block flex-1 rounded-2xl bg-primary py-4 text-center font-medium text-primary-foreground shadow-md shadow-primary/20"
          >
            Try Layerly — no account needed
          </Link>
          <Link
            to="/blog"
            className="block flex-1 rounded-2xl border border-primary/25 py-3.5 text-center font-medium text-primary"
          >
            All posts
          </Link>
        </div>
      </main>
    </Shell>
  );
}
