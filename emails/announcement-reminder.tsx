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

export const WHATSAPP_GROUP_NAME = "DevNodes Family";

type AnnouncementReminderEmailProps = {
  announcementTitle: string;
  /** "in 7 days", "tomorrow", "today". */
  timing: string;
  /** The occurrence itself, e.g. "27 May 2026" or "27 May 2026 – 31 May 2026". */
  occurrence: string;
  /** The finished message, dates already filled in, ready to paste. */
  message: string;
  announcementUrl: string;
};

export default function AnnouncementReminderEmail({
  announcementTitle = "Eid-ul-Adha Holidays Announcement",
  timing = "in 7 days",
  occurrence = "27 May 2026 – 31 May 2026",
  message = "*🐐 Eid-ul-Adha Holidays Announcement*\n\nDear Team,\n\n...",
  announcementUrl = "https://example.com/announcements/1",
}: AnnouncementReminderEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {announcementTitle} is {timing}. Post it in the {WHATSAPP_GROUP_NAME}{" "}
        WhatsApp group.
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
                <Text style={badgeStyle}>Announcement due</Text>
              </Column>
            </Row>
          </Section>

          <Section style={contentStyle}>
            <Heading style={headingStyle}>
              Time to post the {announcementTitle}
            </Heading>
            <Text style={leadStyle}>
              It falls {timing}, on {occurrence}. Post the message below in the{" "}
              <strong>{WHATSAPP_GROUP_NAME}</strong> WhatsApp group so the team
              can plan around it.
            </Text>

            <Text style={messageLabelStyle}>
              Ready to paste — dates already filled in
            </Text>
            {/* The asterisks are deliberate: WhatsApp renders them as bold, so
                the message is pasted exactly as it appears here. */}
            <Section style={messageCardStyle}>
              <Text style={messageStyle}>{message}</Text>
            </Section>

            <Button href={announcementUrl} style={buttonStyle}>
              Open in DevNodes
            </Button>

            <Hr style={ruleStyle} />
            <Text style={noteStyle}>
              Dates wrong, or the wording needs a change? Edit the announcement
              in DevNodes and the next reminder picks it up.
            </Text>
          </Section>
        </Container>

        <Container style={footerContainerStyle}>
          <Text style={footerStyle}>
            You get this because you manage DevNodes. It is sent once per
            announcement, a week ahead, and never to the wider team.
          </Text>
          <Text style={footerBrandStyle}>DevNodes · Announcements</Text>
        </Container>
      </Body>
    </Html>
  );
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const monoFontFamily =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

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

const leadStyle: CSSProperties = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "22px 0 0",
};

const messageLabelStyle: CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  margin: "26px 0 8px",
  textTransform: "uppercase",
};

const messageCardStyle: CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "14px",
  padding: "18px 20px",
};

const messageStyle: CSSProperties = {
  color: "#27272a",
  fontFamily: monoFontFamily,
  fontSize: "13px",
  lineHeight: "1.75",
  margin: 0,
  whiteSpace: "pre-wrap",
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
