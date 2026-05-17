export const fallbackLocale = "en";

export const defaultSupportedLocales = ["zh-CN", "en"];

const loadedMessages = {};
let loadedSupportedLocales = null;

function localeUrl(locale, basePath) {
  return `${basePath.replace(/\/$/, "")}/${locale}.json`;
}

async function loadSupportedLocales(fetchImpl, basePath) {
  if (loadedSupportedLocales) {
    return loadedSupportedLocales;
  }

  try {
    const response = await fetchImpl(localeUrl("supported", basePath), {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      loadedSupportedLocales = await response.json();
      return loadedSupportedLocales;
    }
  } catch (error) {
    console.warn(error);
  }

  loadedSupportedLocales = defaultSupportedLocales;
  return loadedSupportedLocales;
}

export function resolveLocale(preferred, locales = defaultSupportedLocales) {
  if (!preferred) {
    return fallbackLocale;
  }

  if (locales.includes(preferred)) {
    return preferred;
  }

  const language = preferred.toLowerCase().split("-")[0];
  const locale = locales.find((candidate) => candidate.toLowerCase().split("-")[0] === language);

  return locale || fallbackLocale;
}

async function fetchLocaleMessages(locale, fetchImpl, basePath) {
  if (loadedMessages[locale]) {
    return loadedMessages[locale];
  }

  const response = await fetchImpl(localeUrl(locale, basePath), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Unable to load locale ${locale}: ${response.status}`);
  }

  loadedMessages[locale] = await response.json();
  return loadedMessages[locale];
}

export async function loadLocaleMessages(preferred, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const basePath = options.basePath || "/locales";
  const supportedLocales =
    options.supportedLocales || (await loadSupportedLocales(fetchImpl, basePath));
  const locale = resolveLocale(preferred, supportedLocales);

  const fallbackMessages = await fetchLocaleMessages(fallbackLocale, fetchImpl, basePath);

  if (locale === fallbackLocale) {
    return {
      locale,
      messages: {
        [fallbackLocale]: fallbackMessages,
      },
    };
  }

  try {
    const currentMessages = await fetchLocaleMessages(locale, fetchImpl, basePath);
    return {
      locale,
      messages: {
        [fallbackLocale]: fallbackMessages,
        [locale]: currentMessages,
      },
    };
  } catch (error) {
    console.warn(error);
    return {
      locale: fallbackLocale,
      messages: {
        [fallbackLocale]: fallbackMessages,
      },
    };
  }
}

export function getNestedTranslation(messages, key, locale) {
  return key
    .split(".")
    .reduce((value, segment) => value?.[segment], messages[locale]);
}

export function translate(messages, key, replacements = {}, locale = fallbackLocale) {
  const template =
    getNestedTranslation(messages, key, locale) ??
    getNestedTranslation(messages, key, fallbackLocale) ??
    key;

  if (typeof template !== "string") {
    return String(template ?? key);
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => {
    return replacements[token] ?? "";
  });
}
