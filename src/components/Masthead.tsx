import type { SkinIndex } from "../lib/useSkins.ts";

interface Props {
	meta: SkinIndex["meta"];
}

/** Wordmark + catalog metadata strip at the top of the app. */
export function Masthead({ meta }: Props) {
	return (
		<header className="masthead">
			<h1 className="wordmark">
				<span className="a">FORCE</span>
				<span className="b">BUY</span>
				<span className="cursor" aria-hidden="true" />
			</h1>
			<p className="sub">CS2 Budget Loadout Builder</p>
			<div className="metastrip">
				<span>
					<b>{meta.skinCount.toLocaleString()}</b> skins
				</span>
			</div>
		</header>
	);
}
