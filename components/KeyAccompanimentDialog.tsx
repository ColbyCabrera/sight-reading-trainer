import { useEffect, useRef } from "react";
import type {
  ConcreteMusicalKey,
  DifficultyLevel,
  GenerationSettings,
} from "../types";
import {
  getDefaultKeyPoolForLevel,
  KEY_GROUPS,
  ALL_CONCRETE_KEYS,
} from "../utils/musicTheory";

interface KeyAccompanimentDialogProps {
  open: boolean;
  onClose: () => void;
  difficulty: DifficultyLevel;
  selectedKeys: ConcreteMusicalKey[];
  settings: GenerationSettings;
  isLoading: boolean;
  onKeyPoolChange: (keys: ConcreteMusicalKey[]) => void;
  onAccompanimentChange: (
    styles: GenerationSettings["accompanimentStyle"],
  ) => void;
}

export function KeyAccompanimentDialog({
  open,
  onClose,
  difficulty,
  selectedKeys,
  settings,
  isLoading,
  onKeyPoolChange,
  onAccompanimentChange,
}: KeyAccompanimentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const toggleKey = (key: ConcreteMusicalKey) => {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length === 1) return;
      onKeyPoolChange(selectedKeys.filter((entry) => entry !== key));
      return;
    }
    onKeyPoolChange([...selectedKeys, key]);
  };

  const applyDefaultKeyPool = () => {
    onKeyPoolChange(getDefaultKeyPoolForLevel(difficulty));
  };

  const selectAllKeys = () => {
    onKeyPoolChange(ALL_CONCRETE_KEYS);
  };

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-sm bg-transparent p-0 m-auto max-w-md w-[calc(100%-2rem)] rounded-2xl outline-none"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="soft-surface bg-[var(--bg-primary)] p-6 border border-black/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 font-heading tracking-tight">
            Keys & Accompaniment
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Close dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {/* Key Pool */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest">
                Key Pool
              </span>
              <span className="text-xs font-semibold text-amber-700">
                {selectedKeys.length} selected
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={applyDefaultKeyPool}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use Lvl {difficulty} Defaults
              </button>
              <button
                type="button"
                onClick={selectAllKeys}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#E8DEC1] bg-white text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select All
              </button>
            </div>

            <div className="space-y-4">
              {KEY_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-2">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.keys.map((key) => {
                      const checked = selectedKeys.includes(key);
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2 text-[13px] font-medium p-2 rounded-md border transition-colors cursor-pointer ${
                            checked
                              ? "border-amber-200 bg-amber-50/60 text-amber-800"
                              : "border-[#E8DEC1] text-stone-600 hover:bg-white"
                          } ${
                            isLoading ? "opacity-60 cursor-not-allowed" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleKey(key)}
                            disabled={
                              isLoading ||
                              (checked && selectedKeys.length === 1)
                            }
                            className="rounded border-[#E8DEC1] text-amber-600 focus:ring-amber-500 w-4 h-4"
                          />
                          <span>{key}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              The generator picks one key at random from this pool each time.
            </p>
          </div>

          {/* Accompaniment Style */}
          <div className="border-t border-[#E8DEC1] pt-4">
            <div className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-3">
              Accompaniment Pools
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["BLOCK", "BROKEN", "ALBERTI", "WALTZ", "STRIDE"] as const).map(
                (style) => {
                  const currentStyles = settings.accompanimentStyle;
                  return (
                    <label
                      key={style}
                      className={`flex items-center gap-2 text-[13px] font-medium p-2 rounded-md border transition-colors cursor-pointer
                      ${
                        settings.handCoordination !== "INDEPENDENT"
                          ? "opacity-50 cursor-not-allowed bg-stone-50/50"
                          : "hover:bg-[#FDFBF7]"
                      }
                      ${
                        currentStyles.includes(style)
                          ? "border-amber-200 bg-amber-50/50 text-amber-800"
                          : "border-[#E8DEC1] text-stone-600"
                      }
                    `}
                    >
                      <input
                        type="checkbox"
                        checked={currentStyles.includes(style)}
                        onChange={(e) => {
                          let newStyles: typeof currentStyles;
                          if (e.target.checked) {
                            newStyles = [...currentStyles, style];
                          } else {
                            newStyles = currentStyles.filter(
                              (s) => s !== style,
                            );
                          }
                          if (newStyles.length === 0) newStyles = ["BLOCK"];
                          onAccompanimentChange(newStyles);
                        }}
                        disabled={settings.handCoordination !== "INDEPENDENT"}
                        className="rounded border-[#E8DEC1] text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      {style.charAt(0) + style.slice(1).toLowerCase()}
                    </label>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* Done button */}
        <div className="mt-5 pt-4 border-t border-[#E8DEC1]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-sm font-bold rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white hover:from-amber-500 hover:via-amber-600 hover:to-amber-700 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
