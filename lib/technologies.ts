// The catalogue behind the experience letter's technology picker.
//
// Every entry belongs to a category, and the category is what decides how the
// letter describes the work (see `lib/experienceLetter.ts`). Adding a
// technology is therefore just a matter of adding a row here with the right
// category; no template needs to change.

export enum TechnologyCategory {
  Language = "language",
  Frontend = "frontend",
  Backend = "backend",
  Mobile = "mobile",
  Interface = "interface",
  Database = "database",
  Caching = "caching",
  Payments = "payments",
  Cloud = "cloud",
  DevOps = "devops",
  Integration = "integration",
  Testing = "testing",
  Ai = "ai",
  Analytics = "analytics",
  Blockchain = "blockchain",
}

export type Technology = {
  slug: string;
  label: string;
  category: TechnologyCategory;
};

export const TECHNOLOGY_CATEGORY_LABELS: Record<TechnologyCategory, string> = {
  [TechnologyCategory.Language]: "Languages",
  [TechnologyCategory.Frontend]: "Frontend frameworks",
  [TechnologyCategory.Backend]: "Backend frameworks",
  [TechnologyCategory.Mobile]: "Mobile",
  [TechnologyCategory.Interface]: "UI and design systems",
  [TechnologyCategory.Database]: "Databases and data access",
  [TechnologyCategory.Caching]: "Caching and queues",
  [TechnologyCategory.Payments]: "Payments and finance",
  [TechnologyCategory.Cloud]: "Cloud platforms",
  [TechnologyCategory.DevOps]: "DevOps and infrastructure",
  [TechnologyCategory.Integration]: "APIs and messaging",
  [TechnologyCategory.Testing]: "Testing and quality",
  [TechnologyCategory.Ai]: "AI and machine learning",
  [TechnologyCategory.Analytics]: "Analytics and monitoring",
  [TechnologyCategory.Blockchain]: "Blockchain and Web3",
};

// Order here is the order the picker groups render in.
export const TECHNOLOGY_CATEGORY_ORDER: TechnologyCategory[] = [
  TechnologyCategory.Language,
  TechnologyCategory.Frontend,
  TechnologyCategory.Backend,
  TechnologyCategory.Mobile,
  TechnologyCategory.Interface,
  TechnologyCategory.Database,
  TechnologyCategory.Caching,
  TechnologyCategory.Integration,
  TechnologyCategory.Payments,
  TechnologyCategory.Cloud,
  TechnologyCategory.DevOps,
  TechnologyCategory.Testing,
  TechnologyCategory.Ai,
  TechnologyCategory.Analytics,
  TechnologyCategory.Blockchain,
];

const technology = (
  slug: string,
  label: string,
  category: TechnologyCategory
): Technology => ({ slug, label, category });

export const TECHNOLOGIES: Technology[] = [
  // Languages
  technology("typescript", "TypeScript", TechnologyCategory.Language),
  technology("javascript", "JavaScript", TechnologyCategory.Language),
  technology("python", "Python", TechnologyCategory.Language),
  technology("java", "Java", TechnologyCategory.Language),
  technology("csharp", "C#", TechnologyCategory.Language),
  technology("go", "Go", TechnologyCategory.Language),
  technology("rust", "Rust", TechnologyCategory.Language),
  technology("php", "PHP", TechnologyCategory.Language),
  technology("ruby", "Ruby", TechnologyCategory.Language),
  technology("kotlin", "Kotlin", TechnologyCategory.Language),
  technology("swift", "Swift", TechnologyCategory.Language),
  technology("cpp", "C++", TechnologyCategory.Language),
  technology("sql", "SQL", TechnologyCategory.Language),

  // Frontend frameworks
  technology("react", "React", TechnologyCategory.Frontend),
  technology("nextjs", "Next.js", TechnologyCategory.Frontend),
  technology("vue", "Vue.js", TechnologyCategory.Frontend),
  technology("nuxt", "Nuxt", TechnologyCategory.Frontend),
  technology("angular", "Angular", TechnologyCategory.Frontend),
  technology("svelte", "Svelte", TechnologyCategory.Frontend),
  technology("sveltekit", "SvelteKit", TechnologyCategory.Frontend),
  technology("remix", "Remix", TechnologyCategory.Frontend),
  technology("astro", "Astro", TechnologyCategory.Frontend),
  technology("redux", "Redux", TechnologyCategory.Frontend),

  // Backend frameworks
  technology("nodejs", "Node.js", TechnologyCategory.Backend),
  technology("nestjs", "Nest.js", TechnologyCategory.Backend),
  technology("expressjs", "Express.js", TechnologyCategory.Backend),
  technology("fastify", "Fastify", TechnologyCategory.Backend),
  technology("django", "Django", TechnologyCategory.Backend),
  technology("fastapi", "FastAPI", TechnologyCategory.Backend),
  technology("flask", "Flask", TechnologyCategory.Backend),
  technology("laravel", "Laravel", TechnologyCategory.Backend),
  technology("spring-boot", "Spring Boot", TechnologyCategory.Backend),
  technology("rails", "Ruby on Rails", TechnologyCategory.Backend),
  technology("dotnet", ".NET", TechnologyCategory.Backend),

  // Mobile
  technology("react-native", "React Native", TechnologyCategory.Mobile),
  technology("expo", "Expo", TechnologyCategory.Mobile),
  technology("flutter", "Flutter", TechnologyCategory.Mobile),
  technology("ios", "iOS (SwiftUI)", TechnologyCategory.Mobile),
  technology("android", "Android (Jetpack Compose)", TechnologyCategory.Mobile),

  // UI and design systems
  technology("shadcn", "shadcn/ui", TechnologyCategory.Interface),
  technology("tailwind", "Tailwind CSS", TechnologyCategory.Interface),
  technology("material-ui", "Material UI", TechnologyCategory.Interface),
  technology("chakra-ui", "Chakra UI", TechnologyCategory.Interface),
  technology("ant-design", "Ant Design", TechnologyCategory.Interface),
  technology("bootstrap", "Bootstrap", TechnologyCategory.Interface),
  technology("storybook", "Storybook", TechnologyCategory.Interface),
  technology("figma", "Figma", TechnologyCategory.Interface),

  // Databases and data access
  technology("postgresql", "PostgreSQL", TechnologyCategory.Database),
  technology("mysql", "MySQL", TechnologyCategory.Database),
  technology("mongodb", "MongoDB", TechnologyCategory.Database),
  technology("sqlite", "SQLite", TechnologyCategory.Database),
  technology("supabase", "Supabase", TechnologyCategory.Database),
  technology("firebase", "Firebase", TechnologyCategory.Database),
  technology("prisma", "Prisma", TechnologyCategory.Database),
  technology("drizzle", "Drizzle ORM", TechnologyCategory.Database),
  technology("typeorm", "TypeORM", TechnologyCategory.Database),
  technology("elasticsearch", "Elasticsearch", TechnologyCategory.Database),

  // Caching and queues
  technology("redis", "Redis", TechnologyCategory.Caching),
  technology("memcached", "Memcached", TechnologyCategory.Caching),
  technology("bullmq", "BullMQ", TechnologyCategory.Caching),
  technology("celery", "Celery", TechnologyCategory.Caching),

  // APIs and messaging
  technology("rest", "REST APIs", TechnologyCategory.Integration),
  technology("graphql", "GraphQL", TechnologyCategory.Integration),
  technology("trpc", "tRPC", TechnologyCategory.Integration),
  technology("grpc", "gRPC", TechnologyCategory.Integration),
  technology("websockets", "WebSockets", TechnologyCategory.Integration),
  technology("socketio", "Socket.IO", TechnologyCategory.Integration),
  technology("kafka", "Apache Kafka", TechnologyCategory.Integration),
  technology("rabbitmq", "RabbitMQ", TechnologyCategory.Integration),

  // Payments and finance
  technology("stripe", "Stripe", TechnologyCategory.Payments),
  technology("moonpay", "MoonPay", TechnologyCategory.Payments),
  technology("paypal", "PayPal", TechnologyCategory.Payments),
  technology("braintree", "Braintree", TechnologyCategory.Payments),
  technology("adyen", "Adyen", TechnologyCategory.Payments),
  technology("razorpay", "Razorpay", TechnologyCategory.Payments),
  technology("paddle", "Paddle", TechnologyCategory.Payments),
  technology("plaid", "Plaid", TechnologyCategory.Payments),

  // Cloud platforms
  technology("aws", "AWS", TechnologyCategory.Cloud),
  technology("gcp", "Google Cloud Platform", TechnologyCategory.Cloud),
  technology("azure", "Microsoft Azure", TechnologyCategory.Cloud),
  technology("vercel", "Vercel", TechnologyCategory.Cloud),
  technology("netlify", "Netlify", TechnologyCategory.Cloud),
  technology("railway", "Railway", TechnologyCategory.Cloud),
  technology("digitalocean", "DigitalOcean", TechnologyCategory.Cloud),
  technology("cloudflare", "Cloudflare", TechnologyCategory.Cloud),

  // DevOps and infrastructure
  technology("docker", "Docker", TechnologyCategory.DevOps),
  technology("kubernetes", "Kubernetes", TechnologyCategory.DevOps),
  technology("terraform", "Terraform", TechnologyCategory.DevOps),
  technology("github-actions", "GitHub Actions", TechnologyCategory.DevOps),
  technology("gitlab-ci", "GitLab CI", TechnologyCategory.DevOps),
  technology("jenkins", "Jenkins", TechnologyCategory.DevOps),
  technology("nginx", "Nginx", TechnologyCategory.DevOps),
  technology("git", "Git", TechnologyCategory.DevOps),

  // Testing and quality
  technology("jest", "Jest", TechnologyCategory.Testing),
  technology("vitest", "Vitest", TechnologyCategory.Testing),
  technology("cypress", "Cypress", TechnologyCategory.Testing),
  technology("playwright", "Playwright", TechnologyCategory.Testing),
  technology("testing-library", "Testing Library", TechnologyCategory.Testing),
  technology("pytest", "PyTest", TechnologyCategory.Testing),

  // AI and machine learning
  technology("claude-api", "Claude API", TechnologyCategory.Ai),
  technology("openai-api", "OpenAI API", TechnologyCategory.Ai),
  technology("langchain", "LangChain", TechnologyCategory.Ai),
  technology("pinecone", "Pinecone", TechnologyCategory.Ai),
  technology("huggingface", "Hugging Face", TechnologyCategory.Ai),
  technology("tensorflow", "TensorFlow", TechnologyCategory.Ai),
  technology("pytorch", "PyTorch", TechnologyCategory.Ai),

  // Analytics and monitoring
  technology("posthog", "PostHog", TechnologyCategory.Analytics),
  technology("google-analytics", "Google Analytics", TechnologyCategory.Analytics),
  technology("mixpanel", "Mixpanel", TechnologyCategory.Analytics),
  technology("sentry", "Sentry", TechnologyCategory.Analytics),
  technology("datadog", "Datadog", TechnologyCategory.Analytics),
  technology("grafana", "Grafana", TechnologyCategory.Analytics),

  // Blockchain and Web3
  technology("solidity", "Solidity", TechnologyCategory.Blockchain),
  technology("ethersjs", "Ethers.js", TechnologyCategory.Blockchain),
  technology("web3js", "Web3.js", TechnologyCategory.Blockchain),
  technology("hardhat", "Hardhat", TechnologyCategory.Blockchain),
  technology("solana", "Solana", TechnologyCategory.Blockchain),
];

const TECHNOLOGY_BY_SLUG = new Map(
  TECHNOLOGIES.map((item) => [item.slug, item])
);

export const findTechnology = (slug: string) => TECHNOLOGY_BY_SLUG.get(slug);

// Unknown slugs are dropped rather than guessed at, so a letter never names a
// technology the catalogue cannot describe.
export const resolveTechnologies = (slugs: string[]): Technology[] =>
  slugs
    .map((slug) => TECHNOLOGY_BY_SLUG.get(slug))
    .filter((item): item is Technology => item !== undefined);

export const getTechnologiesByCategory = (technologies: Technology[]) =>
  TECHNOLOGY_CATEGORY_ORDER.map((category) => ({
    category,
    label: TECHNOLOGY_CATEGORY_LABELS[category],
    items: technologies.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
