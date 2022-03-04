import React from 'react';
import Container from 'react-bootstrap/Container';
import {TemplateProps} from "./Types";
import {valueOrEmpty} from "./RenderingUtils";
import {createHomePageProvider} from "../provider/HomePage/HomePageProvider";
import {HomePageAttributes, HomePageFields} from "../provider/HomePage/Types";
import {BuiltInAttributes, createProfileDataProvider, SecureAttributeDictionary} from "@youfoundation/dotyoucore-transit-lib";

interface State {
    homePage: SecureAttributeDictionary | null,
    personalInfo: SecureAttributeDictionary | null
}

export class CoverPageTemplate extends React.Component<TemplateProps, State> {

    state: State = {
        homePage: null,
        personalInfo: null
    }

    componentDidMount() {

        const homePageProvider = createHomePageProvider(this.props.options);
        homePageProvider.getAttributeDictionary(HomePageAttributes.HomePage).then(hp => {
            this.setState({homePage: hp});
        });

        const profileDataProvider = createProfileDataProvider(this.props.options)
        profileDataProvider.getStandardProfileAttribute(BuiltInAttributes.PersonalInfo).then(pi => {
            this.setState({personalInfo: pi});
        });
    }

    render() {
        const {homePage} = this.state;

        if (!homePage) {
            return <></>
        }

        return (
            <Container>
                {/*{props.landingPage.headerImageUrl}*/}
                {/*{props.landingPage.tagLine}*/}
                {/*{props.profile.imageUrl}*/}
                {/*{props.profile.firstName}*/}
                {/*{props.profile.surName}*/}
                <div className="row flex-lg-row-reverse align-items-center g-5 py-5">
                    <div className="col-10 col-sm-8 col-lg-6">
                        <img src={valueOrEmpty(homePage, HomePageFields.HeaderImageId)} className="rounded d-block mx-lg-auto img-fluid" alt="" loading="lazy" width="700" height="500"/>
                    </div>
                    <div className="col-lg-6">
                        <h1 className="display-5 fw-bold lh-1 mb-3">{valueOrEmpty(homePage, HomePageFields.TagLineId)}</h1>
                        <p className="lead">{valueOrEmpty(homePage, HomePageFields.LeadTextId)}</p>
                        <div className="d-grid gap-2 d-md-flex justify-content-md-start">
                            <button type="button" className="btn btn-primary btn-lg px-4 me-md-2">Connect</button>
                            <button type="button" className="btn btn-outline-secondary btn-lg px-4">+ Follow</button>
                        </div>
                    </div>
                </div>
            </Container>
        );
    }
}