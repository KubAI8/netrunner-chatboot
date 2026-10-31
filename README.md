# NetRunner

Lokalny czat Next.js z odpowiedziami strumieniowymi przez OpenRouter.
Historia rozmowy pozostaje w pamięci strony; odświeżenie ją usuwa.

## Konfiguracja

Utwórz lub otwórz `.env.local` w głównym folderze projektu (obok `package.json`).
Nie nadpisuj innych ustawień, jeśli ten plik już istnieje. Wpisz samodzielnie:

```dotenv
OPENROUTER_API_KEY=twój_klucz_z_OpenRouter
OPENROUTER_MODEL=identyfikator_wybranego_modelu
```

Model podaj jako identyfikator z katalogu OpenRouter, w formacie `dostawca/model`.
Nie wklejaj klucza do czatu ani do kodu strony. Obie zmienne odczytuje wyłącznie
serwer `/api/chat`. Nie dodawaj do nich prefiksu `NEXT_PUBLIC_`.
`.env` i `.env.local` są ignorowane przez Git, a `.env.example` zawiera puste pola.

## Hasło warsztatowe

W `.env.local` ustaw samodzielnie `CHAT_PASSWORD=twoje_hasło_warsztatowe`.
Wybierz długie, trudne do odgadnięcia hasło. Nie przesyłaj go w rozmowie.
`SESSION_SECRET` został lokalnie wygenerowany przez `crypto.randomBytes(32)`
i dopisany do `.env.local` bez odczytywania wcześniejszej zawartości i bez
wypisywania wartości. Zachowaj tę linię. W `.env.example` oba pola są puste.
Po edycji zrestartuj serwer. Zmienne bez prefiksu `NEXT_PUBLIC_` pozostają na serwerze.

Przed czatem pojawia się ekran „Wpisz hasło”. Sesja trwa 8 godzin, a cookie
zawiera losowy identyfikator, czas wystawienia i wygaśnięcia oraz podpis HMAC-SHA256.
Nie zawiera hasła. Cookie ma `HttpOnly`, `SameSite=Strict`, `Path=/` i `Max-Age`;
w produkcji także `Secure` i nazwę z prefiksem `__Host-` (wymagane HTTPS).
Serwer weryfikuje podpis i wygaśnięcie także przed każdym `/api/chat`.
Brak konfiguracji blokuje logowanie i czat. „Wyjdź” usuwa cookie i historię
interfejsu. Bez przechowywania sesji na serwerze kopia wcześniej wykradzionego
cookie pozostaje ważna do wygaśnięcia; zmiana hasła lub sekretu unieważnia wszystkie sesje.

### Ograniczenie zgadywania hasła

Lokalnie (`npm run dev`, adres localhost/127.0.0.1) dozwolone jest 5 prób
logowania w ciągu minuty, wspólnie dla wszystkich przeglądarek. Licznik jest
tylko w danym procesie i zeruje się po restarcie — nie jest ochroną hostingu.

Na Vercel produkcja wymaga działającej reguły we wspólnym Firewall:

1. W projekcie Vercel otwórz Firewall → Configure → New Rule.
2. Warunek `@vercel/firewall`, Rate limit ID: `netrunner-login`.
3. Ustaw Rate Limit: 5 żądań / 60 sekund, akcja blokowania; opublikuj regułę.
4. Dodaj zmienne serwerowe z `.env.example` w ustawieniach wdrożenia.
   Wygeneruj osobny sekret dla hostingu; nie umieszczaj go w repozytorium.

Kod używa stałego `rateLimitKey: netrunner-workshop`, więc limit jest wspólny
dla tego hasła i instancji, a zmiana IP nie omija licznika. Wszystkie próby
(także poprawne) zużywają limit. Może to czasowo zablokować wejście innym
uczestnikom warsztatu. Brak reguły, błąd Firewall lub inny hosting blokują
logowanie kodem 503; nie ma fallbacku do licznika w pamięci w produkcji.
Nie konfigurowano ani nie publikowano reguły na koncie użytkownika.
[Oficjalna instrukcja Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk).

### Kontrola ręczna

Po ustawieniu hasła i restarcie sprawdź w przeglądarce błędne hasło,
poprawne hasło, przycisk „Wyjdź” oraz ekran hasła po odświeżeniu i w incognito.
W narzędziach przeglądarki sprawdź flagi cookie; na hostingu także `Secure`.
Na rzeczywistym wdrożeniu sprawdź, że szósta próba w minucie jest blokowana
i że po usunięciu reguły nie można się zalogować. Rzeczywista odpowiedź AI
pozostaje do samodzielnego testu; testy automatyczne nie wywołują modelu.

Po zmianie konfiguracji uruchom ponownie `npm run dev` i otwórz
http://127.0.0.1:3000. Pierwsze rzeczywiste zapytanie wyślij samodzielnie
w przeglądarce — może naliczyć opłatę na koncie OpenRouter.
Brak konfiguracji powoduje czytelny błąd zamiast odpowiedzi modelu.

## Wersje i dokumentacja

- `ai` 6.0.320 oraz `@ai-sdk/react` 3.0.323 (ten pakiet zależy od `ai` 6.0.320).
- `@openrouter/ai-sdk-provider` 2.9.1 — wersja wskazana dla AI SDK 6
  w [oficjalnym README OpenRouter](https://github.com/OpenRouterTeam/ai-sdk-provider#legacy-setup-for-ai-sdk-v6).
- Implementacja używa dokumentacji dołączonej do zainstalowanej wersji:
  `node_modules/ai/docs/04-ai-sdk-ui/02-chatbot.mdx` i `21-error-handling.mdx`.
  `useChat` + `DefaultChatTransport` wysyłają historię do `streamText`,
  `convertToModelMessages` konwertuje historię, a `toUIMessageStreamResponse`
  zwraca strumień zgodny z interfejsem klienta AI SDK 6.
- `package-lock.json` zachowuje dokładne drzewo zależności; odtwarzanie: `npm ci`.

## Sprawdzenie bez płatnych wywołań

`npm test` używa wyłącznie lokalnej atrapy OpenRouter i blokuje prawdziwą sieć.
`npm run build` sprawdza kompilację i TypeScript.
