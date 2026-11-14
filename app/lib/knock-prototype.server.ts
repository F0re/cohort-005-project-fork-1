// PROTOTYPE — throwaway Knock spike for "Does Knock hold up against Cadence?"
// Lives on the prototype/knock-spike branch only. Never merge.
import { Knock, signUserToken } from "@knocklabs/node";

// React Router dev doesn't put .env into process.env; Node 22 can.
try {
  process.loadEnvFile();
} catch {
  // no .env — the Knock calls below will say what's missing
}

export const knock = new Knock({ apiKey: process.env.KNOCK_API_KEY });

export const WORKFLOW_DISCUSSION_REPLY = "discussion-reply";
export const WORKFLOW_NEW_ENROLLMENT = "new-enrollment";

type CadenceUser = { id: number; name: string; email: string };

export const knockUserId = (id: number) => String(id);

export async function identify(user: CadenceUser) {
  return knock.users.update(knockUserId(user.id), {
    name: user.name,
    email: user.email,
  });
}

export async function signTokenFor(userId: number) {
  return signUserToken(knockUserId(userId), {
    signingKey: process.env.KNOCK_SIGNING_KEY,
    expiresInSeconds: 60 * 60,
  });
}

export function publicConfig() {
  return {
    publicApiKey: process.env.KNOCK_PUBLIC_API_KEY ?? "",
    feedChannelId: process.env.KNOCK_FEED_CHANNEL_ID ?? "",
  };
}

// Check 2: Discussion Reply → question author. Fired from the real reply action.
export async function triggerDiscussionReply(args: {
  questionAuthor: CadenceUser;
  replier: CadenceUser;
  lessonId: number;
  questionId: number;
  replyId: number;
  replyBody: string;
}) {
  if (args.questionAuthor.id === args.replier.id) return null; // only caused by someone else
  return knock.workflows.trigger(WORKFLOW_DISCUSSION_REPLY, {
    recipients: [
      {
        id: knockUserId(args.questionAuthor.id),
        name: args.questionAuthor.name,
        email: args.questionAuthor.email,
      },
    ],
    actor: {
      id: knockUserId(args.replier.id),
      name: args.replier.name,
      email: args.replier.email,
    },
    data: {
      lesson_id: args.lessonId,
      question_id: args.questionId,
      reply_id: args.replyId,
      reply_excerpt: args.replyBody.slice(0, 140),
    },
  });
}

// Check 4: new Enrollment → Instructor, off by default.
export async function triggerNewEnrollment(args: {
  instructor: CadenceUser;
  student: CadenceUser;
  courseTitle: string;
}) {
  return knock.workflows.trigger(WORKFLOW_NEW_ENROLLMENT, {
    recipients: [
      {
        id: knockUserId(args.instructor.id),
        name: args.instructor.name,
        email: args.instructor.email,
      },
    ],
    actor: {
      id: knockUserId(args.student.id),
      name: args.student.name,
      email: args.student.email,
    },
    data: { course_title: args.courseTitle },
  });
}
