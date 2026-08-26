import type { CSSProperties } from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

type OneOnOneAgendaReminderEmailProps = {
  employeeName: string;
  /** The 1:1 this is about, e.g. "September 2026". */
  period: string;
  oneOnOneUrl: string;
};

export default function OneOnOneAgendaReminderEmail({
  employeeName = "Alex",
  period = "September 2026",
  oneOnOneUrl = "https://example.com/me/one-on-ones",
}: OneOnOneAgendaReminderEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Add your points for the {period} 1:1 — anything you want to talk about.
      </Preview>
      <Body style={bodyStyle}>
        <Container style={cardStyle}>
          <Section style={headerStyle}>
            <Row>
              <Column>
                <Text style={brandStyle}>DevNodes</Text>
                <Text style={brandMetaStyle}>Company workspace</Text>
              </Column>
              <Column align="right">
                <Text style={badgeStyle}>1:1</Text>
              </Column>
            </Row>
          </Section>

          <Section style={contentStyle}>
            <Heading style={headingStyle}>
              Anything you want to talk about?
            </Heading>
            <Text style={greetingStyle}>Hi {employeeName},</Text>
            <Text style={textStyle}>
              Your {period} 1:1 is coming up and there is nothing in your agenda
              yet. If there is something on your mind, add it now so your
              manager sees it beforehand and the conversation starts from what
              you wanted to raise.
            </Text>

            <Text style={promptLabelStyle}>Worth a line if any of it fits</Text>
            <Text style={promptStyle}>
              • Something blocking you, or slowing the work down
              <br />
              • A project or task you want to move onto, or off
              <br />
              • Feedback you would like, or feedback you want to give
              <br />
              • How the workload is feeling right now
              <br />
              • Where you want to grow, and what would help
            </Text>

            <Text style={textStyle}>
              Rough notes are fine. It does not need writing up, and an empty
              agenda is a perfectly good answer if there is genuinely nothing.
            </Text>

            <Button href={oneOnOneUrl} style={buttonStyle}>
              Add my points
            </Button>

            <Hr style={ruleStyle} />
            <Text style={noteStyle}>
              Your agenda is part of your own 1:1. Nothing here is shared with
              the wider team.
            </Text>
          </Section>
        </Container>

        <Container style={footerContainerStyle}>
          <Text style={footerStyle}>
            You get this once a month, and only while that month&apos;s agenda
            is still empty.
          </Text>
          <Text style={footerBrandStyle}>DevNodes · People workspace</Text>
        </Container>
      </Body>
    </Html>
  );
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const bodyStyle: CSSProperties = {
  backgroundColor: "#f4f4f5",
  color: "#18181b",
  fontFamily,
  margin: 0,
  padding: "36px 16px",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "18px",
  boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  borderBottom: "1px solid #eeeeef",
  padding: "26px 30px 20px",
};

const brandStyle: CSSProperties = {
  color: "#18181b",
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  margin: 0,
};

const brandMetaStyle: CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "4px 0 0",
};

const badgeStyle: CSSProperties = {
  border: "1px solid #d4d4d8",
  borderRadius: "999px",
  color: "#52525b",
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 600,
  margin: 0,
  padding: "6px 10px",
};

const contentStyle: CSSProperties = {
  padding: "30px",
};

const headingStyle: CSSProperties = {
  color: "#18181b",
  fontSize: "26px",
  fontWeight: 750,
  letterSpacing: "-0.02em",
  lineHeight: "1.25",
  margin: 0,
};

const greetingStyle: CSSProperties = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "22px 0 0",
};

const textStyle: CSSProperties = {
  color: "#52525b",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "8px 0 0",
};

const promptLabelStyle: CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  margin: "24px 0 8px",
  textTransform: "uppercase",
};

const promptStyle: CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "14px",
  color: "#3f3f46",
  fontSize: "14px",
  lineHeight: "1.9",
  margin: 0,
  padding: "16px 20px",
};

const buttonStyle: CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "999px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  margin: "24px 0 0",
  padding: "12px 20px",
  textDecoration: "none",
};

const ruleStyle: CSSProperties = {
  borderColor: "#eeeeef",
  margin: "26px 0 0",
};

const noteStyle: CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.65",
  margin: "18px 0 0",
};

const footerContainerStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "560px",
  padding: "18px 4px 0",
};

const footerStyle: CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: 0,
};

const footerBrandStyle: CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "10px 0 0",
};
