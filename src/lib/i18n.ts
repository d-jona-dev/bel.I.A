
import fr from '@/lang/fr.json';
import en from '@/lang/en.json';
import es from '@/lang/es.json';
import it from '@/lang/it.json';
import de from '@/lang/de.json';
import ja from '@/lang/ja.json';
import ru from '@/lang/ru.json';
import zh from '@/lang/zh.json';
import pt from '@/lang/pt.json';


export type Language = 'fr' | 'en' | 'es' | 'it' | 'de' | 'ja' | 'ru' | 'zh' | 'pt';

export const i18n: Record<Language, typeof en> = {
  fr,
  en,
  es,
  it,
  de,
  ja,
  ru,
  zh,
  pt,
};
