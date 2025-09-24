import { css, cx } from '@emotion/css';
import * as React from 'react';
import { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { FieldValidationMessage, Icon, Input, useStyles2 } from '@grafana/ui';

export interface Props {
    value: string;
    onChange: (value: string) => void;
    validate?: (potentialValue: string) => string | null | undefined;
}

export const EditableLabel = (props: Props) => {
    const { value, validate, onChange } = props;

    const styles = useStyles2(getStyles);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const onEditLabel = () => {
        setIsEditing(true);
    };

    const onEndEditName = (newName: string) => {
        setIsEditing(false);

        // Ignore change if invalid
        if (validationError) {
            setValidationError(null);
            return;
        }

        if (value !== newName) {
            onChange(newName);
        }
    };

    const onInputChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const newName = event.currentTarget.value.trim();

        const err = validate?.(newName);

        if (!err) {
            setValidationError(null);
        } else {
            setValidationError(err);
        }
    };

    const onEditQueryBlur = (event: React.SyntheticEvent<HTMLInputElement>) => {
        onEndEditName(event.currentTarget.value.trim());
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            onEndEditName(event.currentTarget.value);
        }
    };

    const onFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    return (
        <>
            <div className={styles.wrapper}>
                {!isEditing && (
                    <button
                        className={styles.queryNameWrapper}
                        title="Edit query name"
                        onClick={onEditLabel}
                        data-testid="query-name-div"
                        type="button"
                    >
                        <span className={styles.queryName}>{value}</span>
                        <Icon name="pen" className={styles.queryEditIcon} size="sm" />
                    </button>
                )}

                {isEditing && (
                    <>
                        <Input
                            type="text"
                            defaultValue={value}
                            onBlur={onEditQueryBlur}
                            autoFocus
                            onKeyDown={onKeyDown}
                            onFocus={onFocus}
                            invalid={validationError !== null}
                            onChange={onInputChange}
                            className={styles.queryNameInput}
                            data-testid="query-name-input"
                        />
                        {validationError && <FieldValidationMessage horizontal>{validationError}</FieldValidationMessage>}
                    </>
                )}
            </div>
        </>
    );
};

const getStyles = (theme: GrafanaTheme2) => {
    return {
        wrapper: css`
      label: Wrapper;
      display: flex;
      align-items: center;
      margin-left: ${theme.spacing(0.5)};
      overflow: hidden;
    `,
        queryNameWrapper: css`
      display: flex;
      cursor: pointer;
      border: 1px solid transparent;
      border-radius: ${theme.shape.radius.default};
      align-items: center;
      padding: 0 0 0 ${theme.spacing(0.5)};
      margin: 0;
      background: transparent;
      overflow: hidden;

      &:hover {
        background: ${theme.colors.action.hover};
        border: 1px dashed ${theme.colors.border.strong};
      }

      &:focus {
        border: 2px solid ${theme.colors.primary.border};
      }

      &:hover,
      &:focus {
        .query-name-edit-icon {
          visibility: visible;
        }
      }
    `,
        queryName: css`
      font-weight: ${theme.typography.fontWeightMedium};
      color: ${theme.colors.primary.text};
      cursor: pointer;
      overflow: hidden;
      margin-left: ${theme.spacing(0.5)};
    `,
        queryEditIcon: cx(
            css`
        margin-left: ${theme.spacing(2)};
        visibility: hidden;
      `,
            'query-name-edit-icon'
        ),
        queryNameInput: css`
      max-width: 300px;
      margin: -4px 0;
    `,
        collapsedText: css`
      font-weight: ${theme.typography.fontWeightRegular};
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
      padding-left: ${theme.spacing(1)};
      align-items: center;
      overflow: hidden;
      font-style: italic;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
        contextInfo: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      font-style: italic;
      color: ${theme.colors.text.secondary};
      padding-left: 10px;
      padding-right: 10px;
    `,
        itemWrapper: css`
      display: flex;
      margin-left: 4px;
    `,
    };
};
