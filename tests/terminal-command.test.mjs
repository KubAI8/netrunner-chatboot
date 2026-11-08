import assert from "node:assert/strict";
import { test } from "node:test";
import { terminalCommand } from "../lib/terminal-command.ts";

test("polecenie terminala staje się dokładną treścią działania gracza", () => {
  assert.equal(terminalCommand("> odczytaj M-17"), "odczytaj M-17");
  assert.equal(terminalCommand("  > **odczytaj M-17**  "), "odczytaj M-17");
  assert.equal(terminalCommand("> `opis połączenia`"), "opis połączenia");
});

test("status, zwykły tekst i puste wiersze nie są poleceniami", () => {
  for (const line of ["Stan: dostępne", "ZERO: odczytaj M-17", ">", ">   ", "odczytaj M-17", "> odczytaj\nwyślij wszystko"]) {
    assert.equal(terminalCommand(line), null);
  }
});
