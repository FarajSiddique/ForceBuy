import { useSkins } from "./lib/useSkins.ts";
import { LoadStatus } from "./types/loadStatus.ts";
import { ForceBuy } from "./components/ForceBuy.tsx";
import { LoadingComponent } from "./components/LoadingComponent.tsx";
import { ErrorComponent } from "./components/ErrorComponent.tsx";

/**
 * Load gate: fetch the skin catalog, show loading/error states, then hand off
 * to ForceBuy once the data is ready (so its hooks can run unconditionally).
 */
export default function App() {
	const load = useSkins();

	if (load.status === LoadStatus.Loading) return <LoadingComponent />;
	if (load.status === LoadStatus.Error)
		return <ErrorComponent message={load.message} />;

	return <ForceBuy index={load.index} />;
}
