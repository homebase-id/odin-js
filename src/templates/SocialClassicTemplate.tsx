import React from 'react';
import Container from 'react-bootstrap/Container';
import {Col, Row} from "react-bootstrap";
import './SocialClassic.css';
import {TemplateProps} from "./Types";
import {valueOrEmpty} from "./RenderingUtils";
import {createHomePageProvider} from "../provider/HomePage/HomePageProvider";
import {HomePageAttributes, HomePageFields} from "../provider/HomePage/Types";
import {AttributeData} from "../provider/AttributeData/AttributeDataTypes";
import {createProfileDataProvider} from "../provider/Profile/ProfileDataProvider";
import {BuiltInAttributes, BuiltInProfiles, MinimalProfileFields} from "../provider/Profile/ProfileConfig";

interface State {
    homePage: AttributeData | null,
    personalInfo: AttributeData | null
}

export class SocialClassicTemplate extends React.Component<TemplateProps, State> {

    state: State = {
        homePage: null,
        personalInfo: null
    }

    componentDidMount() {

        const homePageProvider = createHomePageProvider(this.props.options);
        homePageProvider.getAttributeVersions(HomePageAttributes.HomePage).then(list => {
            let hp = list?.versions[0];
            this.setState({homePage: hp});
        });

        const profileDataProvider = createProfileDataProvider(this.props.options);
        profileDataProvider.getAttributeVersions(BuiltInProfiles.StandardProfile, BuiltInAttributes.PersonalInfo).then(list => {
            let pi = list?.versions[0];
            this.setState({personalInfo: pi});
        });
    }


    render() {
        const {homePage, personalInfo} = this.state;

        if (!homePage) {
            return <></>
        }

        const headerStyle = {
            backgroundImage: 'url(' + valueOrEmpty(homePage, HomePageFields.HeaderImageId) + ')'
        }

        let profileImage = valueOrEmpty(personalInfo, MinimalProfileFields.ProfileImageUrlId);
        let name: string = valueOrEmpty(personalInfo, MinimalProfileFields.GiveNameId) + " " + valueOrEmpty(personalInfo, MinimalProfileFields.SurnameId);

        return (
            <Container>
                {/*{props.landingPage.headerImageUrl}*/}
                {/*{props.landingPage.tagLine}*/}
                {/*{props.profile.imageUrl}*/}
                {/*{props.profile.firstName}*/}
                {/*{props.profile.surName}*/}

                <Row className="mt-2 social-classic-header" style={headerStyle}>
                </Row>
                <Row className="mt-2">
                    <div className="col-10 col-sm-8 col-lg-2">
                        <img src={profileImage} className="rounded d-block mx-lg-auto img-fluid" alt="" loading="lazy" width="250" height="250"/>
                    </div>
                    <div className="col-lg-8">
                        <h1 className="display-5 fw-bold lh-1 mb-3">{name}</h1>
                        <p className="lead">{valueOrEmpty(homePage, HomePageFields.LeadTextId)}</p>
                        <div className="d-grid gap-2 d-md-flex justify-content-md-start">
                            <button type="button" className="btn btn-primary btn-lg px-4 me-md-2">Connect</button>
                            <button type="button" className="btn btn-outline-secondary btn-lg px-4">+ Follow</button>
                        </div>
                    </div>
                </Row>
                <Row>
                    <Col className="col-12 col-sm-12 col-lg-9">
                        {valueOrEmpty(personalInfo, MinimalProfileFields.BioId)}
                    </Col>
                    <Col className="col-12 col-sm-3 col- col-lg-3">
                        {/*links go here*/}
                        {/*<ul className="list-group">*/}
                        {/*    {this.props.links.map((link, idx) =>*/}
                        {/*        <li key={idx} className="list-group-item">*/}
                        {/*            <a className="" target="_blank" href={link.href}>{link.title}</a>*/}
                        {/*        </li>*/}
                        {/*    )}*/}
                        {/*</ul>*/}
                    </Col>
                </Row>

            </Container>
        );
    }
}

