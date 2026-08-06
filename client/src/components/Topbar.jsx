import { Link } from "react-router-dom";
import AvatarMenu from "./AvatarMenu";
import { useAuth } from "../hooks/useAuth";
import ticketIcon from '../../assets/ticket-icon.png';

function Topbar() {
    const { user } = useAuth();

    return (
        <header className="topbar">
            <Link to="/" className="brand">
                <img src={ticketIcon} alt="" height={30} width={30} className="brand-mark" aria-hidden="true" />
                Ticketify
            </Link>

            {user ? (
                <div className="topbar-right">
                    <Link to="/my-links" className="nav-link">
                        My links
                    </Link>
                    <AvatarMenu />
                </div>
            ) : (
                <span className="eyebrow">URL shortener</span>
            )}
        </header>
    );
}

export default Topbar;