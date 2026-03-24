import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  category: "repair" | "building" | "management" | "legal" | "business" | "identity";
  publishDate: string;
  imageUrl?: string;
  isActive: boolean;
}

const BLOG_URL = "https://www.westerncreditinstitute.com/blog";

const categorizePost = (title: string, content: string): BlogPost["category"] => {
  const text = (title + " " + content).toLowerCase();
  
  if (text.includes("identity theft") || text.includes("fraud") || text.includes("protect")) {
    return "identity";
  }
  if (text.includes("repair") || text.includes("dispute") || text.includes("remove")) {
    return "repair";
  }
  if (text.includes("build") || text.includes("improve") || text.includes("increase score")) {
    return "building";
  }
  if (text.includes("law") || text.includes("legal") || text.includes("fcra") || text.includes("fdcpa")) {
    return "legal";
  }
  if (text.includes("business") || text.includes("credit repair business") || text.includes("cso")) {
    return "business";
  }
  return "management";
};

const parseHtmlToText = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const extractBlogPosts = (html: string): BlogPost[] => {
  const posts: BlogPost[] = [];
  
  const titlePattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  const linkPattern = /href="(https:\/\/www\.westerncreditinstitute\.com\/post\/[^"]*)"/gi;
  const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi;
  const summaryPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;

  const links: string[] = [];
  let linkMatch;
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    if (!links.includes(linkMatch[1])) {
      links.push(linkMatch[1]);
    }
  }

  const titles: string[] = [];
  let titleMatch;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const title = parseHtmlToText(titleMatch[1]);
    if (title.length > 10 && title.length < 200) {
      titles.push(title);
    }
  }

  const dates: string[] = [];
  let dateMatch;
  while ((dateMatch = datePattern.exec(html)) !== null) {
    dates.push(dateMatch[0]);
  }

  const summaries: string[] = [];
  let summaryMatch;
  while ((summaryMatch = summaryPattern.exec(html)) !== null) {
    const summary = parseHtmlToText(summaryMatch[1]);
    if (summary.length > 50 && summary.length < 500) {
      summaries.push(summary);
    }
  }

  const uniqueTitles = [...new Set(titles)].filter(t => 
    t.toLowerCase().includes("credit") || 
    t.toLowerCase().includes("identity") || 
    t.toLowerCase().includes("debt") ||
    t.toLowerCase().includes("score") ||
    t.toLowerCase().includes("repair") ||
    t.toLowerCase().includes("theft")
  );

  for (let i = 0; i < Math.min(uniqueTitles.length, 10); i++) {
    const title = uniqueTitles[i];
    const url = links[i] || `${BLOG_URL}#post-${i}`;
    const publishDate = dates[i] || new Date().toISOString().split("T")[0];
    const summary = summaries[i] || `Learn valuable insights about ${title.toLowerCase()}.`;
    
    const post: BlogPost = {
      id: `blog-${i + 1}`,
      title,
      summary,
      content: summary,
      url,
      category: categorizePost(title, summary),
      publishDate: new Date(publishDate).toISOString().split("T")[0],
      isActive: true,
    };
    
    posts.push(post);
  }

  return posts;
};

const fallbackBlogPosts: BlogPost[] = [
  {
    id: "blog-1",
    title: "Prevent Identity Theft with These Strategies",
    summary: "This article discusses the increasing concern of identity theft in the digital age and offers practical strategies to safeguard personal information. It emphasizes the importance of awareness and proactive measures to reduce the risk of becoming a victim.",
    content: "Identity theft is one of the fastest-growing crimes in America. Learn how to protect yourself with these proven strategies including monitoring your accounts, using strong passwords, and being cautious with personal information online.",
    url: "https://www.westerncreditinstitute.com/post/prevent-identity-theft-with-these-strategies",
    category: "identity",
    publishDate: "2025-10-27",
    isActive: true,
  },
  {
    id: "blog-2",
    title: "Five Proven Ways to Prevent Identity Theft",
    summary: "This post outlines effective strategies for preventing identity theft, highlighting the need for vigilance and smart habits in both digital and physical environments.",
    content: "Protect your identity with these five proven methods: 1) Freeze your credit, 2) Use two-factor authentication, 3) Monitor your credit reports, 4) Shred sensitive documents, 5) Be wary of phishing attempts.",
    url: "https://www.westerncreditinstitute.com/post/five-proven-ways-to-prevent-identity-theft",
    category: "identity",
    publishDate: "2025-10-27",
    isActive: true,
  },
  {
    id: "blog-3",
    title: "Proven Strategies to Prevent Identity Theft",
    summary: "Comprehensive guide to identity theft prevention including monitoring personal information and adopting smart security habits for long-term protection.",
    content: "Identity theft can devastate your credit and finances. This comprehensive guide covers everything from credit freezes to secure password management to help you stay protected.",
    url: "https://www.westerncreditinstitute.com/post/proven-strategies-to-prevent-identity-theft",
    category: "identity",
    publishDate: "2025-10-27",
    isActive: true,
  },
  {
    id: "blog-4",
    title: "Understanding Your Credit Report",
    summary: "Learn how to read and understand your credit report, identify errors, and take steps to improve your credit score.",
    content: "Your credit report contains vital information about your financial history. Understanding each section helps you identify errors and take corrective action to improve your score.",
    url: "https://www.westerncreditinstitute.com/blog",
    category: "management",
    publishDate: "2025-10-20",
    isActive: true,
  },
  {
    id: "blog-5",
    title: "Credit Repair Tips for Beginners",
    summary: "Starting your credit repair journey? Here are essential tips to help you dispute errors and rebuild your credit effectively.",
    content: "Credit repair doesn't have to be complicated. Start with getting your free credit reports, identifying negative items, and disputing any inaccuracies with the credit bureaus.",
    url: "https://www.westerncreditinstitute.com/blog",
    category: "repair",
    publishDate: "2025-10-13",
    isActive: true,
  },
];

let cachedPosts: BlogPost[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const blogRouter = createTRPCRouter({
  getPosts: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).optional().default(10),
      category: z.enum(["repair", "building", "management", "legal", "business", "identity", "all"]).optional().default("all"),
    }))
    .query(async ({ input }) => {
      const now = Date.now();
      
      if (cachedPosts && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log("[Blog] Returning cached posts");
        let posts = cachedPosts;
        if (input.category !== "all") {
          posts = posts.filter(p => p.category === input.category);
        }
        return posts.slice(0, input.limit);
      }

      try {
        console.log("[Blog] Fetching fresh posts from Western Credit Institute");
        const response = await fetch(BLOG_URL, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WCI-App/1.0)",
            "Accept": "text/html,application/xhtml+xml",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch blog: ${response.status}`);
        }

        const html = await response.text();
        const posts = extractBlogPosts(html);

        if (posts.length > 0) {
          cachedPosts = posts;
          cacheTimestamp = now;
          console.log(`[Blog] Successfully extracted ${posts.length} posts`);
        } else {
          console.log("[Blog] No posts extracted, using fallback");
          cachedPosts = fallbackBlogPosts;
          cacheTimestamp = now;
        }
      } catch (error) {
        console.error("[Blog] Error fetching blog:", error);
        cachedPosts = fallbackBlogPosts;
        cacheTimestamp = now;
      }

      let posts = cachedPosts || fallbackBlogPosts;
      if (input.category !== "all") {
        posts = posts.filter(p => p.category === input.category);
      }
      return posts.slice(0, input.limit);
    }),

  getTipOfTheWeek: publicProcedure.query(async () => {
    const now = Date.now();
    
    if (!cachedPosts || (now - cacheTimestamp) >= CACHE_DURATION) {
      try {
        const response = await fetch(BLOG_URL, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WCI-App/1.0)",
            "Accept": "text/html,application/xhtml+xml",
          },
        });

        if (response.ok) {
          const html = await response.text();
          const posts = extractBlogPosts(html);
          if (posts.length > 0) {
            cachedPosts = posts;
            cacheTimestamp = now;
          } else {
            cachedPosts = fallbackBlogPosts;
            cacheTimestamp = now;
          }
        } else {
          cachedPosts = fallbackBlogPosts;
          cacheTimestamp = now;
        }
      } catch (error) {
        console.error("[Blog] Error fetching tip of the week:", error);
        cachedPosts = fallbackBlogPosts;
        cacheTimestamp = now;
      }
    }

    const posts = cachedPosts || fallbackBlogPosts;
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const weekNumber = Math.floor((now - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const tipIndex = weekNumber % posts.length;
    
    return posts[tipIndex];
  }),

  refreshCache: publicProcedure.mutation(async () => {
    try {
      console.log("[Blog] Force refreshing cache");
      const response = await fetch(BLOG_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WCI-App/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blog: ${response.status}`);
      }

      const html = await response.text();
      const posts = extractBlogPosts(html);

      if (posts.length > 0) {
        cachedPosts = posts;
        cacheTimestamp = Date.now();
        return { success: true, count: posts.length };
      } else {
        cachedPosts = fallbackBlogPosts;
        cacheTimestamp = Date.now();
        return { success: true, count: fallbackBlogPosts.length, fallback: true };
      }
    } catch (error) {
      console.error("[Blog] Error refreshing cache:", error);
      cachedPosts = fallbackBlogPosts;
      cacheTimestamp = Date.now();
      return { success: false, error: String(error), fallback: true };
    }
  }),
});
