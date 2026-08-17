// Server-side translations for the error codes in constants/errorCodes.js.
//
// Deliberately small and self-contained: eleven keys, no i18n library, no build
// step. This is not a second copy of the frontend catalogue in
// atg_frontend/src/locales — it covers only what the API itself emits, so that a
// client which never reached React (a curl, a webhook consumer, a page that
// failed before hydration) still gets a message in the requested language.
//
// The frontend translates the same codes independently from its own catalogue.
// That duplication is intentional: neither side should be unable to show a
// localized error because the other one is missing a string.
//
// `en` is the source of truth for wording. Any code missing from a language
// falls back to `en`, and any code missing from `en` falls back to the message
// the throw site supplied — never to a blank string or a raw key name.

const { ERROR_CODES } = require("../constants/errorCodes");

const SUPPORTED_LOCALES = Object.freeze(["en", "ar", "zh", "fr", "ru", "es", "ta", "si"]);
const DEFAULT_LOCALE = "en";

const MESSAGES = Object.freeze({
  en: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "The database is missing a table this API expects. A migration has not been applied to this environment.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "The database is missing a column this API expects. A migration has not been applied to this environment.",
    [ERROR_CODES.INTERNAL]: "Internal server error",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "The email address or password is incorrect.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "Your session has ended. Please sign in again.",
    [ERROR_CODES.VALIDATION_FAILED]: "Some of the information provided is not valid.",
    [ERROR_CODES.NOT_FOUND]: "The requested item could not be found.",
    [ERROR_CODES.FORBIDDEN]: "You do not have permission to do this.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "This item already exists.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "A service this feature depends on is unavailable. Please try again shortly.",
  },

  ta: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "இந்த API எதிர்பார்க்கும் ஒரு அட்டவணை தரவுத்தளத்தில் இல்லை. இந்தச் சூழலுக்கு ஒரு இடம்பெயர்வு (migration) இன்னும் பயன்படுத்தப்படவில்லை.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "இந்த API எதிர்பார்க்கும் ஒரு நிரல் (column) தரவுத்தளத்தில் இல்லை. இந்தச் சூழலுக்கு ஒரு இடம்பெயர்வு (migration) இன்னும் பயன்படுத்தப்படவில்லை.",
    [ERROR_CODES.INTERNAL]: "உள்ளக சேவையக பிழை",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "மின்னஞ்சல் முகவரி அல்லது கடவுச்சொல் தவறானது.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "உங்கள் அமர்வு முடிந்துவிட்டது. மீண்டும் உள்நுழையவும்.",
    [ERROR_CODES.VALIDATION_FAILED]: "வழங்கப்பட்ட சில தகவல்கள் செல்லுபடியாகாதவை.",
    [ERROR_CODES.NOT_FOUND]: "கோரப்பட்ட உருப்படியைக் கண்டுபிடிக்க முடியவில்லை.",
    [ERROR_CODES.FORBIDDEN]: "இதைச் செய்ய உங்களுக்கு அனுமதி இல்லை.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "இந்த உருப்படி ஏற்கெனவே உள்ளது.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "இந்த அம்சம் சார்ந்திருக்கும் ஒரு சேவை கிடைக்கவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
  },

  si: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "මෙම API අපේක්ෂා කරන වගුවක් දත්ත ගබඩාවේ නොමැත. මෙම පරිසරයට සංක්‍රමණයක් (migration) තවම යොදා නොමැත.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "මෙම API අපේක්ෂා කරන තීරුවක් දත්ත ගබඩාවේ නොමැත. මෙම පරිසරයට සංක්‍රමණයක් (migration) තවම යොදා නොමැත.",
    [ERROR_CODES.INTERNAL]: "අභ්‍යන්තර සේවාදායක දෝෂයකි",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "විද්‍යුත් තැපැල් ලිපිනය හෝ මුරපදය වැරදිය.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "ඔබගේ සැසිය අවසන් වී ඇත. නැවත පිවිසෙන්න.",
    [ERROR_CODES.VALIDATION_FAILED]: "සපයන ලද තොරතුරු සමහරක් වලංගු නොවේ.",
    [ERROR_CODES.NOT_FOUND]: "ඉල්ලූ අයිතමය සොයාගත නොහැකි විය.",
    [ERROR_CODES.FORBIDDEN]: "මෙය කිරීමට ඔබට අවසර නැත.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "මෙම අයිතමය දැනටමත් පවතී.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "මෙම විශේෂාංගය රඳා පවතින සේවාවක් නොමැත. මොහොතකින් නැවත උත්සාහ කරන්න.",
  },

  ar: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "قاعدة البيانات تفتقر إلى جدول تتوقعه واجهة البرمجة هذه. لم يتم تطبيق ترحيل على هذه البيئة.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "قاعدة البيانات تفتقر إلى عمود تتوقعه واجهة البرمجة هذه. لم يتم تطبيق ترحيل على هذه البيئة.",
    [ERROR_CODES.INTERNAL]: "خطأ داخلي في الخادم",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
    [ERROR_CODES.VALIDATION_FAILED]: "بعض المعلومات المقدمة غير صالحة.",
    [ERROR_CODES.NOT_FOUND]: "تعذر العثور على العنصر المطلوب.",
    [ERROR_CODES.FORBIDDEN]: "ليس لديك إذن للقيام بهذا.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "هذا العنصر موجود بالفعل.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "إحدى الخدمات التي تعتمد عليها هذه الميزة غير متاحة. يرجى المحاولة بعد قليل.",
  },

  zh: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]: "数据库缺少此 API 所需的数据表。此环境尚未应用相应的数据库迁移。",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]: "数据库缺少此 API 所需的字段。此环境尚未应用相应的数据库迁移。",
    [ERROR_CODES.INTERNAL]: "服务器内部错误",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "电子邮件地址或密码不正确。",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "您的会话已结束，请重新登录。",
    [ERROR_CODES.VALIDATION_FAILED]: "提交的部分信息无效。",
    [ERROR_CODES.NOT_FOUND]: "找不到请求的内容。",
    [ERROR_CODES.FORBIDDEN]: "您没有执行此操作的权限。",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "该内容已存在。",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "此功能依赖的某项服务暂时不可用，请稍后再试。",
  },

  fr: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "Une table attendue par cette API est absente de la base de données. Une migration n'a pas été appliquée à cet environnement.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "Une colonne attendue par cette API est absente de la base de données. Une migration n'a pas été appliquée à cet environnement.",
    [ERROR_CODES.INTERNAL]: "Erreur interne du serveur",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "L'adresse e-mail ou le mot de passe est incorrect.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "Votre session a pris fin. Veuillez vous reconnecter.",
    [ERROR_CODES.VALIDATION_FAILED]: "Certaines informations fournies ne sont pas valides.",
    [ERROR_CODES.NOT_FOUND]: "L'élément demandé est introuvable.",
    [ERROR_CODES.FORBIDDEN]: "Vous n'avez pas l'autorisation d'effectuer cette action.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "Cet élément existe déjà.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]:
      "Un service dont dépend cette fonctionnalité est indisponible. Veuillez réessayer sous peu.",
  },

  ru: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "В базе данных отсутствует таблица, которую ожидает этот API. Миграция не была применена к этой среде.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "В базе данных отсутствует столбец, который ожидает этот API. Миграция не была применена к этой среде.",
    [ERROR_CODES.INTERNAL]: "Внутренняя ошибка сервера",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "Неверный адрес электронной почты или пароль.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "Ваш сеанс завершён. Пожалуйста, войдите снова.",
    [ERROR_CODES.VALIDATION_FAILED]: "Часть предоставленных данных недействительна.",
    [ERROR_CODES.NOT_FOUND]: "Запрошенный элемент не найден.",
    [ERROR_CODES.FORBIDDEN]: "У вас нет прав для выполнения этого действия.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "Такой элемент уже существует.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "Служба, от которой зависит эта функция, недоступна. Повторите попытку позже.",
  },

  es: {
    [ERROR_CODES.DB_SCHEMA_MISSING_TABLE]:
      "Falta en la base de datos una tabla que esta API espera. No se ha aplicado una migración a este entorno.",
    [ERROR_CODES.DB_SCHEMA_MISSING_COLUMN]:
      "Falta en la base de datos una columna que esta API espera. No se ha aplicado una migración a este entorno.",
    [ERROR_CODES.INTERNAL]: "Error interno del servidor",
    [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "El correo electrónico o la contraseña no son correctos.",
    [ERROR_CODES.AUTH_SESSION_EXPIRED]: "Tu sesión ha finalizado. Vuelve a iniciar sesión.",
    [ERROR_CODES.VALIDATION_FAILED]: "Parte de la información proporcionada no es válida.",
    [ERROR_CODES.NOT_FOUND]: "No se ha encontrado el elemento solicitado.",
    [ERROR_CODES.FORBIDDEN]: "No tienes permiso para hacer esto.",
    [ERROR_CODES.CONFLICT_DUPLICATE]: "Este elemento ya existe.",
    [ERROR_CODES.UPSTREAM_UNAVAILABLE]:
      "Un servicio del que depende esta función no está disponible. Inténtalo de nuevo en breve.",
  },
});

/**
 * Returns the message for `code` in `locale`, falling back to English and then
 * to `fallbackMessage` (what the throw site said). Never returns the bare code:
 * a user reading "DB_SCHEMA_MISSING_COLUMN" is worse off than one reading an
 * English sentence.
 */
const translateErrorCode = (code, locale, fallbackMessage) => {
  if (!code) return fallbackMessage;
  const table = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
  return table[code] || MESSAGES[DEFAULT_LOCALE][code] || fallbackMessage;
};

module.exports = { MESSAGES, SUPPORTED_LOCALES, DEFAULT_LOCALE, translateErrorCode };
