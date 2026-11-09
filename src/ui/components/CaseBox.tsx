import type { CaseDef } from '../../data/cases';

export function CaseBox({ c, big, shake }: { c: Pick<CaseDef, 'palette' | 'glyph'>; big?: boolean; shake?: boolean }) {
  return (
    <div className={`cbox${big ? ' big' : ''}${shake ? ' shake' : ''}`} style={{ ['--c1' as any]: c.palette[0], ['--c2' as any]: c.palette[1] }}>
      <div className="lid" />
      <div className="body" />
      <div className="lock" />
      <div className="glyph">{c.glyph}</div>
    </div>
  );
}
