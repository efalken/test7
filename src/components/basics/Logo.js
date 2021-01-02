import React from 'react';
import Logo from '../../images/logo.png';


export default function LogoImage() {
	return <a href="/">
		<img
			width={300}
			src={Logo}
			alt="Logo"
			className="header-logo" />
	</a>;
}
