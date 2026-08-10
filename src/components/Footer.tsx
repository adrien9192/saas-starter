export default function Footer() {
	return (
		<footer className="mt-auto border-t">
			<div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground">
				<p>© {new Date().getFullYear()} SaaS Starter</p>
			</div>
		</footer>
	);
}
