import { useCallback, useMemo, useState } from "react";
import type { SkinIndex, WeaponGroup } from "../lib/useSkins.ts";
import { computeBudget, type Picks } from "../lib/budget.ts";
import { decodeLoadout } from "../lib/share.ts";
import { Masthead } from "./Masthead.tsx";
import { BudgetPhase } from "./BudgetPhase.tsx";
import { ArmPhase } from "./ArmPhase.tsx";
import { BuildPhase } from "./BuildPhase.tsx";
import { BudgetHud } from "./BudgetHud.tsx";
import { Footer } from "./Footer.tsx";
import { SummaryPanel } from "./SummaryPanel.tsx";
import type { Skin, WearPrice } from "../types/skin.ts";

/**
 * The app once the catalog is loaded: owns all loadout state, the budget math,
 * and the handlers, and composes the phase components. Kept deliberately
 * "smart" (state + logic) while its children stay presentational.
 */
export function ForceBuy({ index }: { index: SkinIndex }) {
	// Restore a shared loadout from the URL on first render, if present.
	const initial = useMemo(
		() => decodeLoadout(window.location.search, index.byId),
		[index],
	);

	const [budgetRaw, setBudgetRaw] = useState(
		initial?.budget ? String(initial.budget) : "",
	);

	const [armed, setArmed] = useState<Set<string>>(
		() => new Set(Object.keys(initial?.picks ?? {})),
	);

	const [picks, setPicks] = useState<Picks>(initial?.picks ?? {});
	const [openWeapon, setOpenWeapon] = useState<string | null>(null);
	const [showSummary, setShowSummary] = useState(false);

	const budget = Math.max(0, Number(budgetRaw) || 0);

	// Armed weapon groups, kept in the catalog's category order.
	const armedGroups: WeaponGroup[] = useMemo(() => {
		const out: WeaponGroup[] = [];
		for (const cat of index.categories) {
			for (const g of cat.weapons) {
				if (armed.has(g.weapon)) out.push(g);
			}
		}
		return out;
	}, [index.categories, armed]);

	const budgetState = useMemo(
		() => computeBudget(budget, armedGroups, picks),
		[budget, armedGroups, picks],
	);

	const pickedCount = armedGroups.filter((g) => picks[g.weapon]).length;

	function toggleArm(weapon: string) {
		setArmed((prev) => {
			const next = new Set(prev);
			if (next.has(weapon)) {
				next.delete(weapon);
				setPicks((p) => {
					const np = { ...p };
					delete np[weapon];
					return np;
				});
				if (openWeapon === weapon) setOpenWeapon(null);
			} else {
				next.add(weapon);
			}
			return next;
		});
	}

	const nextUnpicked = useCallback(
		(after: string): string | null => {
			const idx = armedGroups.findIndex((g) => g.weapon === after);
			for (let i = 1; i <= armedGroups.length; i++) {
				const g = armedGroups[(idx + i) % armedGroups.length];
				if (g.weapon !== after && !picks[g.weapon]) return g.weapon;
			}
			return null;
		},
		[armedGroups, picks],
	);

	// Stable handler identities so memoized WeaponSlot/SkinCard children don't
	// re-render on unrelated state changes (e.g. per-slot search keystrokes).
	const handleEquip = useCallback(
		(weapon: string, skin: Skin, wear: WearPrice) => {
			setPicks((p) => ({ ...p, [weapon]: { skin, equipped: wear } }));
			setOpenWeapon(nextUnpicked(weapon));
		},
		[nextUnpicked],
	);

	const handleClear = useCallback((weapon: string) => {
		setPicks((p) => {
			const np = { ...p };
			delete np[weapon];
			return np;
		});
		setOpenWeapon(weapon);
	}, []);

	const handleToggle = useCallback((weapon: string) => {
		setOpenWeapon((prev) => (prev === weapon ? null : weapon));
	}, []);

	function reset() {
		setBudgetRaw("");
		setArmed(new Set());
		setPicks({});
		setOpenWeapon(null);
		setShowSummary(false);
		// Drop any shared-loadout query so a reset starts truly clean.
		if (window.location.search) {
			window.history.replaceState(null, "", window.location.pathname);
		}
	}

	const showArm = budget > 0;
	const showBuild = showArm && armedGroups.length > 0;

	return (
		<>
			<div className="app">
				<Masthead meta={index.meta} />

				<BudgetPhase budgetRaw={budgetRaw} onBudgetChange={setBudgetRaw} />

				{showArm ? (
					<ArmPhase
						categories={index.categories}
						armed={armed}
						armedCount={armedGroups.length}
						minLoadout={budgetState.minLoadout}
						onToggle={toggleArm}
					/>
				) : null}

				{showBuild ? (
					<BuildPhase
						armedGroups={armedGroups}
						budget={budget}
						picks={picks}
						budgetState={budgetState}
						pickedCount={pickedCount}
						openWeapon={openWeapon}
						onToggle={handleToggle}
						onEquip={handleEquip}
						onClear={handleClear}
					/>
				) : null}

				<Footer />
			</div>

			{showArm ? (
				<BudgetHud
					budget={budget}
					budgetState={budgetState}
					pickedCount={pickedCount}
					armedCount={armedGroups.length}
					onOpenSummary={() => setShowSummary(true)}
					onReset={reset}
				/>
			) : null}

			{showSummary ? (
				<SummaryPanel
					budget={budget}
					budgetState={budgetState}
					armedGroups={armedGroups}
					picks={picks}
					onClose={() => setShowSummary(false)}
				/>
			) : null}
		</>
	);
}
