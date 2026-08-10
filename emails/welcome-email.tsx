import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Text,
} from "react-email";

export interface WelcomeEmailProps {
	name: string;
	dashboardUrl: string;
}

/**
 * Previewable with `pnpm email`. Kept free of app imports so the preview server
 * and the Convex action render exactly the same component.
 */
export default function WelcomeEmail({
	name = "there",
	dashboardUrl = "http://localhost:3000/dashboard",
}: Partial<WelcomeEmailProps>) {
	return (
		<Html lang="en">
			<Head />
			<Preview>Your workspace is ready</Preview>
			<Body
				style={{
					backgroundColor: "#fafafa",
					fontFamily: "ui-sans-serif, system-ui, sans-serif",
				}}
			>
				<Container style={{ padding: "32px", maxWidth: "480px" }}>
					<Heading style={{ fontSize: "20px", margin: "0 0 16px" }}>
						Welcome, {name}
					</Heading>
					<Text
						style={{ fontSize: "15px", lineHeight: "24px", color: "#3f3f46" }}
					>
						Your workspace is ready. Create your first project whenever you are.
					</Text>
					<Button
						href={dashboardUrl}
						style={{
							backgroundColor: "#18181b",
							color: "#ffffff",
							padding: "10px 18px",
							borderRadius: "8px",
							fontSize: "14px",
						}}
					>
						Open the dashboard
					</Button>
				</Container>
			</Body>
		</Html>
	);
}
