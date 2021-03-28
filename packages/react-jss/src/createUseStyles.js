// @flow

import * as React from 'react'
import isInBrowser from 'is-in-browser'
import {ThemeContext as DefaultThemeContext} from 'theming'

import JssContext from './JssContext'
import {
  createStyleSheet,
  addDynamicRules,
  updateDynamicRules,
  removeDynamicRules
} from './utils/sheets'
import getSheetIndex from './utils/getSheetIndex'
import type {HookOptions, Styles, Classes} from './types'
import {manageSheet, unmanageSheet} from './utils/managers'
import getSheetClasses from './utils/getSheetClasses'

const useEffectOrLayoutEffect = isInBrowser ? React.useLayoutEffect : React.useEffect

const noTheme = {}

type CreateUseStyles = <Theme: {}>(Styles<Theme>, HookOptions<Theme> | void) => any => Classes

const createUseStyles: CreateUseStyles = <Theme: {}>(styles, options = {}) => {
  const {index = getSheetIndex(), theming, name, ...sheetOptions} = options
  const ThemeContext = (theming && theming.context) || DefaultThemeContext

  /* eslint-disable no-unused-vars */
  const useTheme =
    typeof styles === 'function'
      ? // $FlowFixMe[incompatible-return]
        (propsTheme?: Theme): Theme => propsTheme || React.useContext(ThemeContext) || noTheme
      : // $FlowFixMe[incompatible-return]
        (_?: Theme): Theme => noTheme
  /* eslint-enable no-unused-vars */

  return function useStyles(data: any) {
    const isFirstMount = React.useRef(true)
    const context = React.useContext(JssContext)
    const theme = useTheme(data.theme)

    const [sheet, dynamicRules] = React.useMemo(
      () => {
        const newSheet = createStyleSheet({
          context,
          styles,
          name,
          theme,
          index,
          sheetOptions
        })

        const newDynamicRules = newSheet ? addDynamicRules(newSheet, data) : null

        if (newSheet) {
          manageSheet({
            index,
            context,
            sheet: newSheet,
            theme
          })
        }

        return [newSheet, newDynamicRules]
      },
      [context, theme]
    )

    useEffectOrLayoutEffect(
      () => {
        // We only need to update the rules on a subsequent update and not in the first mount
        if (sheet && dynamicRules && !isFirstMount.current) {
          updateDynamicRules(data, sheet, dynamicRules)
        }
      },
      [data]
    )

    useEffectOrLayoutEffect(
      () =>
        // cleanup only
        () => {
          if (sheet) {
            unmanageSheet({
              index,
              context,
              sheet,
              theme
            })
          }

          if (sheet && dynamicRules) {
            removeDynamicRules(sheet, dynamicRules)
          }
        },
      [sheet]
    )

    const classes = sheet && dynamicRules ? getSheetClasses(sheet, dynamicRules) : {}

    React.useDebugValue(classes)

    React.useDebugValue(theme === noTheme ? 'No theme' : theme)

    React.useEffect(() => {
      isFirstMount.current = false
    })

    return classes
  }
}

export default createUseStyles
