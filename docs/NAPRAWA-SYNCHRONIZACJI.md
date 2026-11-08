# Naprawa narracji, strumienia i nagrania

## Ustalone przyczyny

- Poprzednia instrukcja wymagała dopisywania metadanych do tekstu odpowiedzi.
  Filtr obsługiwał `<SCENE_STATE>`, ale nie `[SCENE_STATE]`; wariant kwadratowy
  mógł trafić do komponentu wiadomości. Stan był dodatkowo odczytywany z metadanych
  historii przesyłanej przez klienta, bez niezależnego źródła po stronie serwera.
- Modal miał wyłącznie lokalny stan `open`. Nie przekazywał zdarzeń do zapytania czatu,
  więc model nie otrzymywał informacji o rzeczywistym otwarciu okna ani starcie odtwarzacza.
- Renderer wypisywał encje jako tekst i obsługiwał tylko pogrubienie oraz kod inline.
  W ścieżce aplikacji nie znaleziono dodatkowego kodowania HTML. Samo pochodzenie
  encji w konkretnych wcześniejszych odpowiedziach nie zostało odtworzone na prawdziwym modelu.
- Instrukcja nie rozdzielała jednoznacznie zwykłych pytań wewnątrz fabuły od pytań
  o rzeczywistość aplikacji. Nie zakazywała wprost przypisywania motywów gracza.
  To luka w instrukcji, a nie dowód, że prompt sam zapewni poprawne zachowanie.

## Zmiany

- Jedno `streamText` z `Output.object` według dokumentacji AI SDK 6.0.320.
  `partialOutputStream` przekazuje wyłącznie pole `text` do delt tekstowych UI.
  Zatwierdzony stan jest wysyłany jako `messageMetadata`, oddzielnie od narracji.
- Usunięto wymaganie tekstowych znaczników i przykłady zawierające te znaczniki.
  Wąska kwarantanna starego protokołu obsługuje oba warianty i ich częściowe fragmenty.
  Nigdy nie interpretuje ich jako stanu. Pokazuje osobny komunikat aplikacji.
- Mały rejestr stanu prezentacji na serwerze, związany z sesją i rozmową.
  Metadane klienta nie są źródłem dostępów. Autoryzacja i walidacja ról pozostają niezależne.
- Oddzielne zdarzenia okna: otwarcie, zamknięcie, rozpoczęcie filmu, niedostępność.
  Są przesyłane przy następnej wiadomości, bez dodatkowego wywołania modelu i bez
  fikcyjnej wypowiedzi gracza. Otwarcie nie oznacza obejrzenia filmu.
- Restart unieważnia zdarzenia poprzedniej sesji, resetuje dostępność i usuwa poprzedni
  tekst rozgrywki z kontekstu przekazywanego do modelu. Historia w interfejsie pozostaje.
- Bezpieczne dekodowanie encji do tekstu, bez wstawiania HTML. Częściowe encje czekają
  na dokończenie. Podstawowe formatowanie starszych odpowiedzi jest renderowane przez React.
- Instrukcja rozdziela pytania fabularne od wyraźnych pytań o fikcję, zabrania
  dopisywania motywacji i maskowania usterek fabułą. Scenariusz i nazwy zachowano.
- Wybrany klip korytarza dodano lokalnie jako ilustrację; nie jest zapisem dialogu Leny.
  Transkrypcja M-17 jest osobnym materiałem. Źródło opisano w MEDIA.md.

## Wykonane kontrole

- `npm test`: 46/46 zaliczonych. Atrapy sieci i fikcyjne dane konfiguracyjne.
  Obejmuje autoryzację, walidację ról, streaming znak po znaku, oba stare protokoły,
  fałszywe metadane klienta, odrębne zdarzenia nagrania, restart, błędne i przerwane
  odpowiedzi, bezpieczny rendering oraz transkrypcję bez źródła filmu.
- `npm run typecheck`: zaliczone.
- `npm run build -- --webpack`: pełna kompilacja produkcyjna zakończona powodzeniem.
- `git diff --check`: bez błędów.
- Lokalne HEAD `/media/laboratory-corridor.mp4`: HTTP 200, `video/mp4`, 3 945 091 bajtów.
- Testów zachowania prawdziwego modelu, odtwarzania i klawiatury w przeglądarce
  nie uruchomiono. Nie użyto płatnych usług ani nie odczytano wartości sekretów.

Scenariusze ręczne i ograniczenia: TESTY-ARASAKA.md.
