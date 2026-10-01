// Development-only entry for UI verification. Not a build entry or a production route.
import { createRoot } from "react-dom/client";
import { AuthPanel } from "../../src/ui/AuthPanel";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/libre-caslon-display/latin-400.css";
import "../../src/styles.css";

createRoot(document.getElementById("root")!).render(<div className="app"><main><AuthPanel onRecovered={() => window.location.reload()} /></main></div>);
