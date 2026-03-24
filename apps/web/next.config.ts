import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      images: {
        unoptimized: true,
      },
    }
  : {
      async redirects() {
        return [
          {
            source: "/articles",
            has: [
              {
                type: "query",
                key: "channel",
                value: "startups",
              },
            ],
            destination: "/articles/startups",
            permanent: false,
          },
          {
            source: "/articles",
            has: [
              {
                type: "query",
                key: "channel",
                value: "product-launches",
              },
            ],
            destination: "/articles/product-launches",
            permanent: false,
          },
          {
            source: "/articles",
            has: [
              {
                type: "query",
                key: "channel",
                value: "industry-analysis",
              },
            ],
            destination: "/articles/industry-analysis",
            permanent: false,
          },
          {
            source: "/articles",
            has: [
              {
                type: "query",
                key: "channel",
              },
            ],
            destination: "/articles",
            permanent: false,
          },
          {
            source: "/admin/v2",
            destination: "/admin",
            permanent: false,
          },
          {
            source: "/admin/v2/inbox",
            destination: "/admin/inbox",
            permanent: false,
          },
          {
            source: "/admin/v2/review/:id",
            destination: "/admin/review/:id",
            permanent: false,
          },
          {
            source: "/admin/v2/editor/:proposalId",
            destination: "/admin/editor/:proposalId",
            permanent: false,
          },
          {
            source: "/admin/v2/editor/revisions/:revisionId",
            destination: "/admin/editor/revisions/:revisionId",
            permanent: false,
          },
          {
            source: "/admin/v2/publish/:proposalId",
            destination: "/admin/publish/:proposalId",
            permanent: false,
          },
          {
            source: "/admin/v2/publish/revisions/:revisionId",
            destination: "/admin/publish/revisions/:revisionId",
            permanent: false,
          },
          {
            source: "/admin/v2/published",
            destination: "/admin/published",
            permanent: false,
          },
          {
            source: "/admin/v2/published/:slug",
            destination: "/admin/published/:slug",
            permanent: false,
          },
        ];
      },
    };

export default nextConfig;
