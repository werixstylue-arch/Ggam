import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

export const Panel = ({ open, onClose, title, subtitle, children, wide = false, id }) => <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
  <DialogContent className={`kingcom-panel ${wide ? 'wide-panel' : ''}`} data-testid={`${id}-panel`}>
    <div className="panel-heading"><span className="panel-eyebrow" data-testid={`${id}-eyebrow`}>KINGCOM / {id?.toUpperCase()}</span><DialogTitle className="panel-title" data-testid={`${id}-title`}>{title}</DialogTitle><DialogDescription className="panel-subtitle" data-testid={`${id}-subtitle`}>{subtitle}</DialogDescription></div>
    {children}
  </DialogContent>
</Dialog>;