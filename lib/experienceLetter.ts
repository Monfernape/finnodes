import { ExperienceLetter } from "@/entities";
import {
  Technology,
  TechnologyCategory,
  resolveTechnologies,
} from "@/lib/technologies";
import { surnameWithHonorific, withHonorific } from "@/lib/documentText";

export const COMPANY_NAME = "DevNodes";

// Who the letter is signed by. Kept here so both the on-screen preview and the
// PDF use the same sign-off without each caller repeating it.
export const LETTER_SIGN_OFF = {
  name: "Muhammad Usman",
  title: "Co-Founder",
};

// "React, Next.js, and Nest.js" — the way the letter reads it aloud.
export const joinWithAnd = (values: string[]) => {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
};

const labelsFor = (technologies: Technology[], ...categories: TechnologyCategory[]) =>
  technologies
    .filter((item) => categories.includes(item.category))
    .map((item) => item.label);

const formatLetterDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export type ExperienceLetterContent = {
  title: string;
  addressee: string;
  opening: string;
  assignment: string | null;
  responsibilitiesLead: string;
  responsibilities: string[];
  closing: string[];
  signOffName: string;
  signOffTitle: string;
};

// Each category contributes at most one bullet, so a letter stays readable
// however many technologies were picked. The order below is the order the
// bullets appear in, which walks the stack from product surface to platform.
const buildResponsibilities = (technologies: Technology[]) => {
  const bullets: string[] = [];

  const frontend = labelsFor(technologies, TechnologyCategory.Frontend);
  const backend = labelsFor(technologies, TechnologyCategory.Backend);
  const languages = labelsFor(technologies, TechnologyCategory.Language);
  const mobile = labelsFor(technologies, TechnologyCategory.Mobile);
  const interfaces = labelsFor(technologies, TechnologyCategory.Interface);
  const databases = labelsFor(technologies, TechnologyCategory.Database);
  const caching = labelsFor(technologies, TechnologyCategory.Caching);
  const integration = labelsFor(technologies, TechnologyCategory.Integration);
  const payments = labelsFor(technologies, TechnologyCategory.Payments);
  const cloud = labelsFor(technologies, TechnologyCategory.Cloud);
  const devops = labelsFor(technologies, TechnologyCategory.DevOps);
  const testing = labelsFor(technologies, TechnologyCategory.Testing);
  const ai = labelsFor(technologies, TechnologyCategory.Ai);
  const analytics = labelsFor(technologies, TechnologyCategory.Analytics);
  const blockchain = labelsFor(technologies, TechnologyCategory.Blockchain);

  // Someone who worked on both ends is described as full stack in a single
  // bullet, rather than being split into two narrower ones.
  if (frontend.length > 0 && backend.length > 0) {
    bullets.push(
      `Designing and developing full-stack web applications using ${joinWithAnd([
        ...frontend,
        ...backend,
      ])}.`
    );
    bullets.push("Building and maintaining scalable backend infrastructure and APIs.");
  } else if (frontend.length > 0) {
    bullets.push(
      `Building responsive, high-performance web applications using ${joinWithAnd(
        frontend
      )}.`
    );
  } else if (backend.length > 0) {
    bullets.push(
      `Designing and building scalable backend services and APIs using ${joinWithAnd(
        backend
      )}.`
    );
  }

  if (languages.length > 0) {
    bullets.push(
      `Writing clean, maintainable, production-grade code in ${joinWithAnd(
        languages
      )}.`
    );
  }

  if (mobile.length > 0) {
    bullets.push(
      `Developing and shipping cross-platform mobile applications using ${joinWithAnd(
        mobile
      )}.`
    );
  }

  if (interfaces.length > 0) {
    bullets.push(
      `Developing modern, responsive user interfaces using ${joinWithAnd(
        interfaces
      )} and current front-end best practices.`
    );
  }

  if (payments.length > 0) {
    bullets.push(
      "Leading the implementation of critical business features, particularly those involving secure payment processing and financial transactions."
    );
    bullets.push(
      `Integrating and managing payment solutions using ${joinWithAnd(payments)}.`
    );
  }

  // Databases and caching read as one sentence about the data layer when both
  // are present, which is how the two usually come up together in practice.
  if (databases.length > 0 && caching.length > 0) {
    bullets.push(
      `Designing and optimizing databases using ${joinWithAnd(
        databases
      )}, and implementing caching strategies with ${joinWithAnd(caching)}.`
    );
  } else if (databases.length > 0) {
    bullets.push(
      `Designing, modelling, and optimizing databases using ${joinWithAnd(
        databases
      )}.`
    );
  } else if (caching.length > 0) {
    bullets.push(
      `Implementing caching and background processing strategies with ${joinWithAnd(
        caching
      )}.`
    );
  }

  if (integration.length > 0) {
    bullets.push(
      `Designing service-to-service communication and real-time features using ${joinWithAnd(
        integration
      )}.`
    );
  }

  if (ai.length > 0) {
    bullets.push(
      `Building and integrating AI-driven product features using ${joinWithAnd(ai)}.`
    );
  }

  if (blockchain.length > 0) {
    bullets.push(
      `Developing smart contracts and on-chain integrations using ${joinWithAnd(
        blockchain
      )}.`
    );
  }

  if (cloud.length > 0 && devops.length > 0) {
    bullets.push(
      `Deploying and operating production workloads on ${joinWithAnd(
        cloud
      )}, with automated build and release pipelines using ${joinWithAnd(devops)}.`
    );
  } else if (cloud.length > 0) {
    bullets.push(
      `Deploying, monitoring, and scaling production applications on ${joinWithAnd(
        cloud
      )}.`
    );
  } else if (devops.length > 0) {
    bullets.push(
      `Automating build, release, and deployment pipelines using ${joinWithAnd(
        devops
      )}.`
    );
  }

  if (testing.length > 0) {
    bullets.push(
      `Safeguarding product quality through automated testing with ${joinWithAnd(
        testing
      )}.`
    );
  }

  if (analytics.length > 0) {
    bullets.push(
      `Instrumenting product analytics, monitoring, and error tracking using ${joinWithAnd(
        analytics
      )}.`
    );
  }

  // Closing bullets are unconditional: they describe how everyone here works,
  // so they hold whatever the technology selection was.
  bullets.push(
    "Collaborating closely with cross-functional teams to deliver secure, reliable, and high-performance applications."
  );
  bullets.push(
    "Participating in technical planning, architecture discussions, code reviews, and mentoring team members where required."
  );

  return bullets;
};

export const buildExperienceLetterContent = (
  letter: Pick<
    ExperienceLetter,
    | "employee_name"
    | "designation"
    | "date_of_joining"
    | "served_until"
    | "technologies"
    | "mentions_client"
  >,
  options: { signOffName: string; signOffTitle: string }
): ExperienceLetterContent => {
  const technologies = resolveTechnologies(letter.technologies ?? []);
  const role = letter.designation || "Software Engineer";
  const joined = letter.date_of_joining
    ? formatLetterDate(letter.date_of_joining)
    : null;

  // Tenure phrasing is the one place the letter changes shape: a current
  // employee "is currently serving", a past one has a closed date range.
  const tenure = letter.served_until
    ? `${joined ? `from ${joined} ` : ""}until ${formatLetterDate(
        letter.served_until
      )}`
    : `${joined ? `since ${joined}, ` : ""}and is currently serving in this role`;

  const fullName = withHonorific(letter.employee_name);
  const shortName = surnameWithHonorific(letter.employee_name);

  const opening = `This is to certify that ${fullName} has been employed with ${COMPANY_NAME} as a ${role} ${tenure}.`;

  // Past employees are written about in the past tense throughout, so a letter
  // for someone who has left never reads as though they are still on the team.
  const isFormer = letter.served_until !== null;

  const assignment = letter.mentions_client
    ? `During his tenure, ${shortName} ${
        isFormer ? "was" : "has been"
      } assigned to work with one of our valued international clients, where he ${
        isFormer ? "played" : "has played"
      } a key role in designing, developing, and maintaining scalable web applications and backend infrastructure. He ${
        isFormer ? "consistently demonstrated" : "has consistently demonstrated"
      } strong technical expertise, ownership, and a commitment to delivering high-quality software solutions.`
    : `During his tenure, ${shortName} ${
        isFormer ? "played" : "has played"
      } a key role in designing, developing, and maintaining scalable applications and backend infrastructure, consistently demonstrating strong technical expertise, ownership, and a commitment to delivering high-quality software solutions.`;

  const closing = [
    `Throughout his employment, ${shortName} ${
      isFormer ? "proved" : "has proven"
    } himself to be a dedicated, dependable, and highly skilled professional. His technical proficiency, problem-solving abilities, and ownership of mission-critical features ${
      isFormer ? "made" : "have made"
    } him a valuable contributor to the success of our client engagements.`,
    "We appreciate his contributions and wish him continued success in his professional career.",
  ];

  return {
    title: "EXPERIENCE CERTIFICATE",
    addressee: "To Whom It May Concern",
    opening,
    assignment,
    responsibilitiesLead: isFormer
      ? "His primary responsibilities included:"
      : "His primary responsibilities include:",
    responsibilities: buildResponsibilities(technologies),
    closing,
    signOffName: options.signOffName,
    signOffTitle: options.signOffTitle,
  };
};

export const formatExperienceLetterFileName = (letter: ExperienceLetter) =>
  `${letter.employee_name} Experience Letter.pdf`;
