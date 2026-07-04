/** Standing disclaimer — prices are estimates; Steam is the source of truth. */
export function Footer() {
  return (
    <footer className="footer">
      Prices are recent reference estimates (Skinport median), not live quotes.
      The source of truth for buying is always the{" "}
      <a
        href="https://steamcommunity.com/market/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Steam Community Market
      </a>
      . ForceBuy is a planning tool — verify every price on Steam before you buy.
      Not affiliated with Valve or Steam.
    </footer>
  );
}
