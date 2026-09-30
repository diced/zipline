// oxlint-disable-next-line no-restricted-imports -- the one place allowed to wrap Trans
import { Trans } from 'react-i18next';

// <Trans> parses the translated string, interpolated values included, as markup. Without escaping,
// a value such as a username containing "<anchor>x</anchor>" would render the mapped component.
// Values are escaped before parsing and the resulting text is unescaped again, so they always show
// up literally. Plain t() does not need this: React already escapes the strings it renders.
const SafeTrans = ((props: any) => (
  <Trans
    {...props}
    tOptions={{
      ...props.tOptions,
      interpolation: { ...props.tOptions?.interpolation, escapeValue: true },
    }}
    shouldUnescape
  />
)) as typeof Trans;

export default SafeTrans;
