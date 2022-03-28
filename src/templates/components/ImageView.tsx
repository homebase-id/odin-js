import {Guid} from "guid-typescript";
import {Image} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {ProviderOptions} from "../../provider/ProviderBase";
import {createMediaProvider} from "../../provider/MediaProvider";



export type ImageViewProps = {
    driveIdentifier: Guid,
    fileId: Guid,
    className?: string
    width: string,
    height: string,
    options: ProviderOptions
}

// export class ImageView extends React.Component<ImageViewProps> {}

function ImageView(props: ImageViewProps) {

    const mediaProvider = createMediaProvider(props.options);
    const [imageUrl, setImageUrl] = useState<string>();

    useEffect(() => {
        let initImage = async () => {
            if (Guid.isGuid(props.fileId || "")) {
                let url = await mediaProvider.getDecryptedImageUrl(props.driveIdentifier, props.fileId);
                setImageUrl(url);
            }
        };
        initImage();
    }, [props]);

    return (<Image className={props.className} thumbnail={true} src={imageUrl} width={props.width} height={props.height}/>)
}

export default ImageView;