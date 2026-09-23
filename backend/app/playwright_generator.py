"""
Playwright Script Generator
Converts an rrweb-style action log into executable Playwright scripts
(Python sync API and TypeScript async API).
"""

from __future__ import annotations
from typing import Any

# ─── Action type mapping ──────────────────────────────────────────────────────

_IGNORED_TYPES = {"mousemove", "mouseenter", "mouseleave", "mouseover"}


def _format_selector(sel: str | None) -> str:
    if not sel:
        return "'body'"
    # Wrap in quotes
    return f"'{sel}'"


def _to_py_line(action: dict[str, Any]) -> str | None:
    t = action.get("type", "")
    selector = _format_selector(action.get("selector"))
    url = action.get("url", "")
    value = action.get("value", "")
    key = action.get("key", "")

    if t in _IGNORED_TYPES:
        return None

    match t:
        case "navigate" | "goto":
            return f"    page.goto('{url}')"
        case "click":
            return f"    page.click({selector})"
        case "fill" | "input" | "change":
            return f"    page.fill({selector}, '{value}')"
        case "check":
            return f"    page.check({selector})"
        case "uncheck":
            return f"    page.uncheck({selector})"
        case "select" | "select_option":
            return f"    page.select_option({selector}, '{value}')"
        case "scroll":
            x = action.get("x", 0)
            y = action.get("y", 0)
            return f"    page.evaluate('window.scrollTo({x}, {y})')"
        case "keyboard" | "keydown" | "keypress":
            return f"    page.keyboard.press('{key}')"
        case "type":
            return f"    page.type({selector}, '{value}')"
        case "hover":
            return f"    page.hover({selector})"
        case "dblclick":
            return f"    page.dblclick({selector})"
        case "focus":
            return None  # skip focus events
        case "wait":
            ms = action.get("ms", 1000)
            return f"    page.wait_for_timeout({ms})"
        case _:
            return f"    # Unhandled action: {t} on {selector}"


def _to_ts_line(action: dict[str, Any]) -> str | None:
    t = action.get("type", "")
    selector = _format_selector(action.get("selector"))
    url = action.get("url", "")
    value = action.get("value", "")
    key = action.get("key", "")

    if t in _IGNORED_TYPES:
        return None

    match t:
        case "navigate" | "goto":
            return f"  await page.goto('{url}');"
        case "click":
            return f"  await page.click({selector});"
        case "fill" | "input" | "change":
            return f"  await page.fill({selector}, '{value}');"
        case "check":
            return f"  await page.check({selector});"
        case "uncheck":
            return f"  await page.uncheck({selector});"
        case "select" | "select_option":
            return f"  await page.selectOption({selector}, '{value}');"
        case "scroll":
            x = action.get("x", 0)
            y = action.get("y", 0)
            return f"  await page.evaluate(() => window.scrollTo({x}, {y}));"
        case "keyboard" | "keydown" | "keypress":
            return f"  await page.keyboard.press('{key}');"
        case "type":
            return f"  await page.type({selector}, '{value}');"
        case "hover":
            return f"  await page.hover({selector});"
        case "dblclick":
            return f"  await page.dblclick({selector});"
        case "focus":
            return None
        case "wait":
            ms = action.get("ms", 1000)
            return f"  await page.waitForTimeout({ms});"
        case _:
            return f"  // Unhandled action: {t} on {selector}"


def _deduplicate(actions: list[dict]) -> list[dict]:
    """Remove consecutive duplicate mousemove / scroll events."""
    result = []
    prev_type = None
    for a in actions:
        t = a.get("type", "")
        if t in _IGNORED_TYPES:
            continue
        if t == "scroll" and prev_type == "scroll":
            result[-1] = a  # keep last scroll position
            continue
        result.append(a)
        prev_type = t
    return result


# ─── Public API ───────────────────────────────────────────────────────────────

def generate_playwright_python(actions: list[dict], base_url: str = "https://your-app.com") -> str:
    actions = _deduplicate(actions)
    lines = [
        "from playwright.sync_api import sync_playwright",
        "",
        "",
        "def run():",
        "    with sync_playwright() as p:",
        "        browser = p.chromium.launch(headless=False)",
        "        page = browser.new_page()",
        f"        page.goto('{base_url}')",
        "",
    ]

    for action in actions:
        line = _to_py_line(action)
        if line:
            lines.append(line)

    lines += [
        "",
        "        browser.close()",
        "",
        "",
        "if __name__ == '__main__':",
        "    run()",
        "",
    ]
    return "\n".join(lines)


def generate_playwright_typescript(actions: list[dict], base_url: str = "https://your-app.com") -> str:
    actions = _deduplicate(actions)
    lines = [
        "import { test, expect } from '@playwright/test';",
        "",
        "",
        "test('Recorded session replay', async ({ page }) => {",
        f"  await page.goto('{base_url}');",
        "",
    ]

    for action in actions:
        line = _to_ts_line(action)
        if line:
            lines.append(line)

    lines += [
        "});",
        "",
    ]
    return "\n".join(lines)
