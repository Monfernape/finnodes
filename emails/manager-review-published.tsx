import type { CSSProperties } from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

type ManagerReviewPublishedEmailProps = {
  employeeName: string;
  reviewName: string;
  reviewUrl: string;
};

export default function ManagerReviewPublishedEmail({
  employeeName = "Alex",
  reviewName = "Mid-year performance review",
  reviewUrl = "https://example.com/me/reviews",
}: ManagerReviewPublishedEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {reviewName} is ready to view in DevNodes.</Preview>
      <Body style={bodyStyle}>
        <Container style={cardStyle}>
          <Section style={headerStyle}>
            <Row>
              <Column>
                <Text style={brandStyle}>DevNodes</Text>
                <Text style={brandMetaStyle}>Company workspace</Text>
              </Column>
              <Column align="right">
                <Text style={badgeStyle}>Performance review</Text>
              </Column>
            </Row>
          </Section>

          <Section style={contentStyle}>
            <Heading style={headingStyle}>
              Your performance review is ready
            </Heading>
            <Text style={greetingStyle}>Hi {employeeName},</Text>
            <Text style={textStyle}>
              Your manager has shared your {reviewName}. Review it securely in
              your DevNodes workspace.
            </Text>

            <Button href={reviewUrl} style={buttonStyle}>
              View performance review
            </Button>

            <Text style={privacyStyle}>
              For your privacy, review responses are not included in this
              email. Sign in to DevNodes to view the complete review.
            </Text>
          </Section>
        </Container>

        <Container style={footerContainerStyle}>
          <Text style={footerStyle}>
            This notification was sent because your manager shared a
            performance review with your DevNodes account. If you were not
            expecting it, contact your manager.
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

const privacyStyle: CSSProperties = {
  borderTop: "1px solid #eeeeef",
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.65",
  margin: "26px 0 0",
  padding: "18px 0 0",
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
