import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { APICallError, convertToModelMessages, streamText, validateUIMessages } from "ai";
import { requireSession } from "../../../lib/auth.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const providerError =
  "OpenRouter: nie udało się uzyskać odpowiedzi. Spróbuj ponownie; jeśli błąd wróci, sprawdź dostępność wybranego modelu.";

function describeProviderError(error: unknown): string {
  // Wysyłamy tylko własne komunikaty, nigdy treść błędu ani nagłówki providera.
  const code = APICallError.isInstance(error)
    ? error.statusCode
    : typeof error === "object" && error !== null && "code" in error && typeof error.code === "number"
      ? error.code
      : undefined;

  switch (code) {
    case 401:
      return "OpenRouter: klucz API został odrzucony (401). Sprawdź OPENROUTER_API_KEY w .env.local i uruchom ponownie serwer.";
    case 402:
      return "OpenRouter: niewystarczające środki lub limit wydatków klucza (402). Sprawdź saldo konta i limit klucza w OpenRouter.";
    case 403:
      return "OpenRouter: dostęp został zabroniony (403). Sprawdź uprawnienia klucza i ograniczenia wybranego modelu.";
    case 404:
      return "OpenRouter: model lub jego dostawca jest niedostępny (404). Sprawdź dokładny identyfikator OPENROUTER_MODEL w .env.local.";
    case 400:
    case 422:
      return `OpenRouter: model odrzucił żądanie (${code}). Sprawdź, czy OPENROUTER_MODEL wskazuje model obsługujący czat.`;
    case 429:
      return "OpenRouter: przekroczono limit zapytań (429). Poczekaj chwilę i spróbuj ponownie.";
    case 500:
    case 502:
    case 503:
      return `OpenRouter: chwilowy problem usługi lub dostawcy modelu (${code}). Spróbuj ponownie później.`;
    default:
      return APICallError.isInstance(error) && code === undefined
        ? "OpenRouter: serwer nie mógł połączyć się z usługą. Sprawdź połączenie internetowe i spróbuj ponownie."
        : providerError;
  }
}

export async function POST(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  const missing = [!apiKey && "OPENROUTER_API_KEY", !model && "OPENROUTER_MODEL"].filter(Boolean);

  if (!apiKey || !model) {
    return new Response(
      `Brak konfiguracji: ${missing.join(", ")}. Uzupełnij .env.local i uruchom ponownie serwer.`,
      { status: 503 },
    );
  }

  let modelMessages;
  try {
    const body = await request.json();
    const messages = await validateUIMessages({ messages: body?.messages });

    if (
      messages.length === 0 ||
      messages.at(-1)?.role !== "user" ||
      messages.some((message) => message.role !== "user" && message.role !== "assistant")
    ) {
      throw new Error("Nieprawidłowa historia");
    }

    // Ten czat obsługuje wyłącznie tekst. Przekazujemy całą historię tekstową.
    const textMessages = messages.map((message) => ({
      ...message,
      parts: message.parts.filter((part) => part.type === "text"),
    }));

    if (textMessages.some((message) => message.role === "user" &&
      !message.parts.some((part) => part.text.trim()))) {
      throw new Error("Pusta wiadomość");
    }

    modelMessages = await convertToModelMessages(
      textMessages.filter((message) => message.parts.some((part) => part.text.trim())),
    );
  } catch {
    return new Response("Nieprawidłowa lub pusta wiadomość. Wpisz treść i spróbuj ponownie.", { status: 400 });
  }

  try {
    const openrouter = createOpenRouter({ apiKey });
    const result = streamText({
      model: openrouter(model),
      system: "Jesteś NetRunner, pomocnym asystentem. Odpowiadaj po polsku, jasno i zwięźle.",
      messages: modelMessages,
      abortSignal: request.signal,
      maxRetries: 0,
      // Nie zapisujemy surowych błędów providera, które mogą zawierać dane żądania.
      onError: () => {},
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      onError: describeProviderError,
    });
  } catch (error) {
    return new Response(describeProviderError(error), { status: 502 });
  }
}
