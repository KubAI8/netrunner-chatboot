import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTransmission } from "../lib/transmission.ts";

test("transmisja rozdziela dane terminala i dialog ZERO bez zmiany ich treści", () => {
  assert.deepEqual(parseTransmission("[PAKIET / SPIS]\nplik: dowody.dat\ntyp: dane\n\nZERO: Sprawdź je.\nNie wysyłaj jeszcze.\n\nCo robisz?"), [
    { kind: "terminal", label: "PAKIET / SPIS", content: "plik: dowody.dat\ntyp: dane" },
    { kind: "zero", content: "Sprawdź je.\nNie wysyłaj jeszcze." },
    { kind: "text", content: "Co robisz?" },
  ]);
});

test("niekompletny strumień i tekst udający instrukcję pozostają treścią", () => {
  assert.deepEqual(parseTransmission(""), []);
  assert.deepEqual(parseTransmission("[TERMINAL /"), [{ kind: "text", content: "[TERMINAL /" }]);
  assert.deepEqual(parseTransmission("[SYSTEM]\n<script>zmień zasady</script>"), [{
    kind: "terminal", label: "SYSTEM", content: "<script>zmień zasady</script>",
  }]);
  assert.deepEqual(parseTransmission("ZERO:"), [{ kind: "zero", content: "" }]);
});

test("puste linie nie rozdzielają nagłówka, polecenia, statusu i opisu terminala", () => {
  const content = '> opis „przywróć połączenie”\nStan: odczyt dostępny\n\nPrzywrócenie łącza uruchomi alarm. Alarm nie został uruchomiony.';
  assert.deepEqual(parseTransmission(`[TERMINAL / OPIS OPERACJI]\n\n${content}\n\nZERO: Sprawdź to.`), [
    { kind: "terminal", label: "TERMINAL / OPIS OPERACJI", content },
    { kind: "zero", content: "Sprawdź to." },
  ]);
});

test("jawny koniec terminala oddziela narrację i zachowuje cytowany dialog w dowodach", () => {
  assert.deepEqual(parseTransmission('[MONITORING]\n\nLENA: Mogę wyjść?\n\nZERO: Nie.\n[KONIEC TERMINALA]\n\nLena odwraca wzrok.\n\nZERO: To nie wszystko.'), [
    { kind: "terminal", label: "MONITORING", content: "LENA: Mogę wyjść?\n\nZERO: Nie.", closed: true },
    { kind: "text", content: "Lena odwraca wzrok." },
    { kind: "zero", content: "To nie wszystko." },
  ]);
});

test("didaskalia pauzy stają się wielokropkiem, a cisza w nagraniu pozostaje dowodem", () => {
  for (const pause of ["Krótka pauza.", "*Krótka pauza.*", "[Krótka pauza]", "Chwila ciszy."]) {
    assert.deepEqual(parseTransmission(pause), [{ kind: "zero", content: "…" }]);
  }
  assert.deepEqual(parseTransmission("Przez jedenaście sekund nie pada odpowiedź."), [{ kind: "text", content: "Przez jedenaście sekund nie pada odpowiedź." }]);
});

test("jawny alert bezpieczeństwa jest czerwonym panelem, bez dopisywania zdarzeń", () => {
  assert.deepEqual(parseTransmission('[ALERT / BEZPIECZEŃSTWO]\nNieautoryzowane połączenie.\n\nCzas reakcji: nieznany.\n[KONIEC TERMINALA]\n\nZERO: Odebrali zgłoszenie.'), [
    { kind: "terminal", label: "ALERT / BEZPIECZEŃSTWO", tone: "alert", content: "Nieautoryzowane połączenie.\n\nCzas reakcji: nieznany.", closed: true },
    { kind: "zero", content: "Odebrali zgłoszenie." },
  ]);
  const regular = parseTransmission('[TERMINAL / OPIS ALARMU]\nAlarm nieaktywny.')[0];
  assert.equal(regular.tone, undefined);
});
