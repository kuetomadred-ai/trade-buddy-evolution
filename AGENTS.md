<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The PLOTOS FUND app lives as a self-contained page in public/plotos/ and the home page shows it full-screen; edit that file directly so the existing trading engine and Biquote feed stay untouched.
- Keep chart interaction on Lightweight Charts plus a pointer-event canvas overlay, so live prices, orders, and saved drawings share one coordinate system.
