import React from 'react'
import WarningSign from '../../images/WarningSign.png'

export default function WarningSignFunction({ ...props }) {
    return <img {...props} role="presentation" src={WarningSign} alt="Warning Sign" />
}